import { Address, DataI, Credential, PrivateKey, CredentialType, Script, DataConstr, DataB, PublicKey, defaultPreprodGenesisInfos, ScriptType } from "@harmoniclabs/plu-ts";
import getTxBuilder from "./getTxBuilder";
import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";
import blockfrost from "./blockfrost";
import { readFile } from "fs/promises";

async function claimVesting(Blockfrost: BlockfrostPluts)
{
    const txBuilder = await getTxBuilder(Blockfrost);

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

    const utxos = await Blockfrost.addressUtxos( address )
        .catch( e => { throw new Error ("unable to find utxos at " + addr) });
    // atleast has 10 ada
    const utxo = utxos.find(utxo => utxo.resolved.value.lovelaces >= 15_000_000);
    if (!utxo) {
        throw new Error("No utxo with more than 10 ada");
    }

    const scriptUtxos = await Blockfrost.addressUtxos( scriptAddr )
        .catch( e => { throw new Error ("unable to find utxos at " + addr) });
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
        invalidBefore: (await Blockfrost.getChainTip()).slot!
    });

    await tx.signWith( privateKey )

    const submittedTx = await Blockfrost.submitTx( tx );
    console.log(submittedTx);
    
}

if( process.argv[1].includes("claimVesting") )
{
    claimVesting(blockfrost());
}