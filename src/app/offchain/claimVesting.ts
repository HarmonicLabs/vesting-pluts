import { Address, DataI, Credential, PrivateKey, CredentialType, Script, DataConstr, DataB, PublicKey, defaultPreprodGenesisInfos, ScriptType, IProvider, Machine, UPLCProgram, parseUPLC } from "@harmoniclabs/plu-ts";
import getTxBuilder from "../utils/getTxBuilder";
import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";
import { readFile } from "fs/promises";
import { Emulator } from "@harmoniclabs/pluts-emulator";

/**
 * Claims funds from a vesting contract
 * @param provider The provider to use (Blockfrost or Emulator)
 * @returns The transaction hash
 */
export async function claimVesting(provider: BlockfrostPluts | Emulator): Promise<string> {
    const txBuilder = await getTxBuilder(provider);

    const scriptFile = await readFile("./testnet/vesting.plutus.json", { encoding: "utf-8" });
    const script = Script.fromCbor(JSON.parse(scriptFile).cborHex, ScriptType.PlutusV3)

    const scriptAddr = new Address(
        "testnet",
        new Credential(CredentialType.Script, script.hash)
    );

    const privateKeyFile = await readFile("./testnet/payment2.skey", { encoding: "utf-8" });
    const privateKey = PrivateKey.fromCbor(JSON.parse(privateKeyFile).cborHex);

    const pubKey = privateKey.derivePublicKey();

    const addr = await readFile("./testnet/address2.addr", { encoding: "utf-8" });
    const address = Address.fromString(addr);

    const publicKeyFile = await readFile("./testnet/payment2.vkey", { encoding: "utf-8" });
    const pkh = PublicKey.fromCbor(JSON.parse(publicKeyFile).cborHex).hash;


    const utxos = await provider.addressUtxos(address)
        .catch(e => { throw new Error(`Unable to find UTxOs at ${addr}: ${e.message}`) });

    // At least has 15 ADA
    let utxo; 
    utxos.forEach(item => { 
        if (item.resolved.value.lovelaces >= 15_000_000) {
            utxo = item;
        }
    });
    if (!utxo) {
        throw new Error("No UTxO with more than 15 ADA");
    }

    let collateralUtxo;
    utxos.forEach(item => {
        if (item.resolved.value.lovelaces <= 5_000_000) {
            collateralUtxo = item;
        }
    });
    if (!collateralUtxo) {
            throw new Error("No collateral UTxO with less than 5 ADA");
        }

    const scriptUtxos = await provider.addressUtxos(scriptAddr)
        .catch(e => { throw new Error(`Unable to find UTxOs at script address: ${e.message}`) });
        
    // Find the script UTxO that matches our public key hash
    const scriptUtxo = scriptUtxos.find(utxo => {
        if (utxo.resolved.datum instanceof DataConstr) { 
            const pkhData = utxo.resolved.datum.fields[0]; 
            if (pkhData instanceof DataB) {
                return pkh.toString() === Buffer.from(pkhData.bytes.toBuffer()).toString("hex");
            }
        }
        return false; 
    });
    
    if (!scriptUtxo) {
        throw new Error("No script UTxO found for the pkh");
    }
     
    txBuilder.setGenesisInfos(defaultPreprodGenesisInfos);

    if (Buffer.from(script.hash.toBuffer()).toString("hex") !== Buffer.from(scriptAddr.paymentCreds.hash.toBuffer()).toString("hex")) {
        throw new Error("Script hash and script address hash do not match");
    }

    // Get chain tip to set correct validity timeframe
    const chainTip = await provider.getChainTip();
    const invalidBefore = chainTip.slot!;
    console.log("Claim Invalid Before : " + invalidBefore)
    
    let tx = await txBuilder.buildSync({
        inputs: [
            { utxo: utxo }, // Regular input
            {
                utxo: scriptUtxo, // Script input
                inputScript: {
                    script: script, // Plutus script
                    datum: "inline", // Datum associated with the script UTxO
                    redeemer: new DataI(0) // Redeemer to unlock the script UTxO
                }
            }
        ],
        requiredSigners: [pkh],
        collaterals: collateralUtxo ? [collateralUtxo] : [],
        changeAddress: address,
        invalidBefore: invalidBefore
    });

    await tx.signWith(privateKey);
    
    const submittedTx = await provider.submitTx(tx);
    
    return submittedTx;
}