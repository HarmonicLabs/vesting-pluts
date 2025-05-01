import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";
import { Address, ITxBuildInput, IUTxO, PrivateKey } from "@harmoniclabs/plu-ts";
import { readFile, readdir} from "fs/promises";
import { Emulator } from "../package";
// import { blockfrost } from "../utils/getProvider";
import getTxBuilder from "../utils/getTxBuilder";

// Faucet return address (preprod)
const faucetAddress = "addr_test1qqr585tvlc7ylnqvz8pyqwauzrdu0mxag3m7q56grgmgu7sxu2hyfhlkwuxupa9d5085eunq2qywy7hvmvej456flknswgndm3";

/**
 * Finds all key pairs in the specified directory
 * @param keyDir Directory containing the keys and addresses
 * @returns Array of key indices found
 */
async function findKeyPairs(keyDir: string): Promise<number[]> {
    try {
      // Read all files in the directory
      const files = await readdir(keyDir);
      
      // Find all files matching the pattern "payment*.skey"
      const skeyFiles = files.filter(file => file.match(/^payment(\d+)\.skey$/));
      
      // Extract the indices from the filenames
      const indices = skeyFiles.map(file => {
        const match = file.match(/^payment(\d+)\.skey$/);
        return match ? parseInt(match[1]) : -1;
      }).filter(index => index > 0);
      
      return indices.sort((a, b) => a - b);
    } catch (error) {
      console.error(`Error scanning directory ${keyDir}:`, error);
      return [];
    }
  }

/**
 * Returns all funds from generated addresses back to the faucet
 * @param numKeys Number of key pairs to process (default: 2)
 * @param keyDir Directory containing the keys and addresses (default: "./testnet")
 * @param useEmulator Whether to use the emulator instead of Blockfrost (default: false)
 * @returns Transaction hash of the submitted transaction
 */
export async function returnFaucet(provider: BlockfrostPluts | Emulator, keyDir = "./testnet", useEmulator = false): Promise<string> {
    try {
        const keyIndices = await findKeyPairs(keyDir);

        if (keyIndices.length === 0) {
            console.log("No key pairs found in the specified directory.");
            return "";
        }
        
        const utxos: ITxBuildInput[] = [];
        const pvtKeys: PrivateKey[] = [];

        for (const keyIndex of keyIndices) {
            try {
                const pvtKeyPath = `${keyDir}/payment${keyIndex}.skey`;
                const pvtKeyFile = await readFile(pvtKeyPath, { encoding: "utf-8" });
                const pvtKey = PrivateKey.fromCbor(JSON.parse(pvtKeyFile).cborHex);

                // Load address
                const addrPath = `${keyDir}/address${keyIndex}.addr`;
                const addrFile = await readFile(addrPath, { encoding: "utf-8" });
                const addr = Address.fromString(addrFile);

                // Get UTxOs for the address
                const addrUtxos = await provider.addressUtxos(addr);

                if (addrUtxos.length === 0) {
                    console.log(`No UTxOs found for address ${addr}`);
                    continue;
                }

                const totalLovelaces = addrUtxos.reduce((sum, utxo) => sum + utxo.resolved.value.lovelaces, 0n);
                
                // Cannot send less than 1 ADA
                if (totalLovelaces < 1_000_000) {
                    console.log(`Not enough lovelaces at address ${addr}. Skipping...`);
                    continue;
                }
                
                // Add UTxOs to the list
                addrUtxos.forEach(utxo => utxos.push({ utxo }));

                // Add private key to the list
                pvtKeys.push(pvtKey);

            } catch (error) {
                console.error(`Error processing key pair ${keyIndex}:`, error);
                // Continue to the next key pair
                continue;
            }
        }

        // Check if we have any UTxOs to process
        if (utxos.length === 0) {
            console.log("No UTxOs found for the specified key pairs.");
            return "";
        }

        // Building the transaction
        const txBuilder = await getTxBuilder(provider);

        let returnTx = await txBuilder.buildSync({
            inputs: utxos,
            changeAddress: faucetAddress,
        });

        // Sign the transaction with all private keys
        for (const privateKey of pvtKeys) {
            await returnTx.signWith(privateKey);
        }

        // Submit the transaction
        const submittedTx = await provider.submitTx(returnTx);
        return submittedTx;
    } catch (error) {
        console.error("Error returning funds to faucet:", error);
        throw error;
    }
}


// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    let keyDir = "./testnet";
    let useEmulator = false;
    
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--dir' || args[i] === '-d') {
        if (i + 1 < args.length) {
          keyDir = args[i + 1];
          i++;
        }
      } else if (args[i] === '--emulator' || args[i] === '-e') {
        useEmulator = true;
      } else if (!args[i].startsWith('-') && i === 0) {
        keyDir = args[i];
      }
    }
    
    return { keyDir, useEmulator };
  }


// if( process.argv[1].includes("returnFaucet"))
// {
//     const provider = blockfrost();
//     const { keyDir, useEmulator } = parseArgs();
//     returnFaucet( keyDir , useEmulator);
// }