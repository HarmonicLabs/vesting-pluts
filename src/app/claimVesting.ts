import { Address, DataI, Credential, PrivateKey, CredentialType, Script, DataConstr, DataB, PublicKey, defaultPreprodGenesisInfos, ScriptType, IProvider } from "@harmoniclabs/plu-ts";
import getTxBuilder from "./getTxBuilder";
import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";
import blockfrost from "./blockfrost";
import { readFile } from "fs/promises";
import { Emulator } from "./package";

/**
 * Claims funds from a vesting contract
 * @param provider The provider to use (Blockfrost or Emulator)
 * @returns The transaction hash
 */
export async function claimVesting(provider: BlockfrostPluts | Emulator): Promise<string> {
    console.log("\n=== DEBUG: claimVesting ===");
    const txBuilder = await getTxBuilder();

    const scriptFile = await readFile("./testnet/vesting.plutus.json", { encoding: "utf-8" });
    const script = Script.fromCbor(JSON.parse(scriptFile).cborHex, ScriptType.PlutusV3)
    console.log("Script hash:", Buffer.from(script.hash.toBuffer()).toString("hex"));

    const scriptAddr = new Address(
        "testnet",
        new Credential(CredentialType.Script, script.hash)
    );
    console.log("Script address:", scriptAddr.toString());

    const privateKeyFile = await readFile("./testnet/payment2.skey", { encoding: "utf-8" });
    const privateKey = PrivateKey.fromCbor(JSON.parse(privateKeyFile).cborHex);

    const pubKey = privateKey.derivePublicKey();
    console.log("Signer public key:", pubKey.toString());

    const addr = await readFile("./testnet/address2.addr", { encoding: "utf-8" });
    const address = Address.fromString(addr);
    console.log("Signer address:", address.toString());

    const publicKeyFile = await readFile("./testnet/payment2.vkey", { encoding: "utf-8" });
    const pkh = PublicKey.fromCbor(JSON.parse(publicKeyFile).cborHex).hash;
    console.log("Signer PKH (hex):", pkh.toString());
    console.log("Signer PKH (buffer):", Buffer.from(pkh.toBuffer()).toString("hex"));

    const utxos = await provider.addressUtxos(address)
        .catch(e => { throw new Error(`Unable to find UTxOs at ${addr}: ${e.message}`) });
    console.log(`Found ${utxos.length} UTxOs at signer address`);

    // At least has 15 ADA
    const utxo = utxos.find(utxo => utxo.resolved.value.lovelaces >= 15_000_000);
    if (!utxo) {
        throw new Error("No UTxO with more than 15 ADA");
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
     
    // Debug datum content
    if (scriptUtxo.resolved.datum instanceof DataConstr) {
        console.log("Datum fields count:", scriptUtxo.resolved.datum.fields.length);
        
        // Beneficiary field
        const beneficiaryData = scriptUtxo.resolved.datum.fields[0];
        if (beneficiaryData instanceof DataB) {
            const beneficiaryHex = Buffer.from(beneficiaryData.bytes.toBuffer()).toString("hex");
            console.log("Beneficiary in datum (hex):", beneficiaryHex);
            console.log("Beneficiary matches signer:", beneficiaryHex === pkh.toString());
            console.log("Beneficiary matches buffer:", beneficiaryHex === Buffer.from(pkh.toBuffer()).toString("hex"));
        } else {
            console.log("Beneficiary field is not DataB type:", beneficiaryData.constructor.name);
        }
        
        // Deadline field
        const deadlineData = scriptUtxo.resolved.datum.fields[1];
        if (deadlineData instanceof DataI) {
            const deadlineValue = Number(deadlineData.int);
            console.log("Deadline in datum:", deadlineValue);
            console.log("Current time:", Date.now());
            console.log("Is deadline passed:", Date.now() > deadlineValue);
        } else {
            console.log("Deadline field is not DataI type:", deadlineData.constructor.name);
        }
    } else {
        console.log("Script UTxO datum is not a DataConstr:", 
            scriptUtxo.resolved.datum ? scriptUtxo.resolved.datum.constructor.name : "undefined");
    }
    txBuilder.setGenesisInfos(defaultPreprodGenesisInfos);

    if (Buffer.from(script.hash.toBuffer()).toString("hex") !== Buffer.from(scriptAddr.paymentCreds.hash.toBuffer()).toString("hex")) {
        throw new Error("Script hash and script address hash do not match");
    }

    // Get chain tip to set correct validity timeframe
    const chainTip = await provider.getChainTip();
    const invalidBefore = chainTip.slot!;

    let tx = await txBuilder.buildSync({
        inputs: [
            { utxo: utxo },
            {
                utxo: scriptUtxo,
                inputScript: {
                    script: script,
                    datum: "inline",
                    redeemer: new DataI(0)
                }
            }
        ],
        requiredSigners: [pkh],
        collaterals: [utxo],
        changeAddress: address,
        // invalidBefore: invalidBefore
    });

    await tx.signWith(privateKey);
    console.log("Transaction built successfully");
    
    const submittedTx = await provider.submitTx(tx);
    console.log(`Claim transaction submitted: ${submittedTx}`);
    
    return submittedTx;
}