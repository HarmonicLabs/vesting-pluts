import {DataI, DataConstr, DataB} from "@harmoniclabs/plu-ts";
import { Address, Credential, PrivateKey, CredentialType, Script, PublicKey, ScriptType } from "@harmoniclabs/plu-ts";
import { defaultPreprodGenesisInfos } from "@harmoniclabs/buildooor";
import getTxBuilder from "./getTxBuilder";
// import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";
// import blockfrost from "./blockfrost";
import { readFile } from "fs/promises";
import { getEmulatorInstance } from "./emulatorInstance";

async function claimVesting() //Blockfrost: BlockfrostPluts)
{
    const txBuilder = await getTxBuilder();

    const scriptFile = await readFile("./testnet/vesting.plutus.json", { encoding: "utf-8" });
    const script = Script.fromCbor(JSON.parse(scriptFile).cborHex, ScriptType.PlutusV3)
    const scriptAddr = new Address(
        "testnet",
        new Credential(CredentialType.Script, script.hash)
    );
    
    const privateKeyFile = await readFile("./testnet/payment2.skey", { encoding: "utf-8" });
    const privateKey = PrivateKey.fromCbor( JSON.parse(privateKeyFile).cborHex );

    const addr = await readFile("./testnet/address2.addr", { encoding: "utf-8" });
    const address = Address.fromString(addr);

    const publicKeyFile = await readFile("./testnet/payment2.vkey", { encoding: "utf-8" });
    const pkh = PublicKey.fromCbor( JSON.parse(publicKeyFile).cborHex ).hash;
    
    
    const emulator = await getEmulatorInstance();

    const utxo = emulator.getAddressUtxos(address)?.find(utxo => utxo.resolved.value.lovelaces >= 15_000_000);
    if (!utxo) {
        throw new Error("No UTxO with at least 15 ADA found");
    }

    // const scriptUtxos = await Blockfrost.addressUtxos( scriptAddr )
    //     .catch( e => { throw new Error ("unable to find utxos at " + addr) });

    // // matches with the pkh
    // const scriptUtxo = scriptUtxos.find(utxo => {
    //     if (utxo.resolved.datum instanceof DataConstr) { 
    //      const pkhData = utxo.resolved.datum.fields[0]; 
    //      if (pkhData instanceof DataB) {
    //          return pkh.toString() == Buffer.from( pkhData.bytes.toBuffer() ).toString("hex")
    //      }
    //     }
    //     return false; 
    //  });
    // if (!scriptUtxo) {
    //     throw new Error ("No script utxo found for the pkh")
    // }
    
    const scriptUtxos = emulator.getAddressUtxos(scriptAddr)
    if (!scriptUtxos) {
        throw new Error("unable to find utxos at " + addr);
    }

    // matches with the pkh
    const scriptUtxo = scriptUtxos.find(utxo => {
        if (utxo.resolved.datum instanceof DataConstr) { 
         const pkhData = utxo.resolved.datum.fields[0]; 
         if (pkhData instanceof DataB) {
             return pkh.toString() == Buffer.from( pkhData.bytes.toBuffer() ).toString("hex")
         }
        }
        return false; 
     });
    if (!scriptUtxo) {  
        throw new Error ("No script utxo found for the pkh")
    }
        


    txBuilder.setGenesisInfos( defaultPreprodGenesisInfos )

    if (Buffer.from(script.hash.toBuffer()).toString("hex") !== Buffer.from(scriptAddr.paymentCreds.hash.toBuffer()).toString("hex")) {
        throw new Error("Script hash and script address hash do not match");
    }

    let tx = await txBuilder.buildSync({
        inputs: [
            { utxo: utxo },
            {
                utxo: scriptUtxo,
                inputScript: {
                    script: script,
                    datum: "inline",
                    redeemer: new DataI( 0 )
                }
            }
        ],
        requiredSigners: [ pkh ], // required to be included in script context
        collaterals: [ utxo ],
        changeAddress: address,
        // invalidBefore: (await Blockfrost.getChainTip()).slot!
    });

    await tx.signWith( privateKey )

    // const submittedTx = await Blockfrost.submitTx( tx );
    const submittedTx = await emulator.submitTx( tx );

    console.log(submittedTx);
    

    emulator.awaitBlock(1)

}

if( process.argv[1].includes("claimVesting") )
{
    claimVesting() //(blockfrost());
}