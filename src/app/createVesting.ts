import { Address, Credential, Hash28, PrivateKey, Value, pBSToData, pByteString, pIntToData, CredentialType, PublicKey, Script, ScriptType } from "@harmoniclabs/plu-ts";
import VestingDatum from "../VestingDatum";
import getTxBuilder from "./getTxBuilder";
import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";
import blockfrost from "./blockfrost";
import { readFile } from "fs/promises";

async function createVesting(Blockfrost: BlockfrostPluts)
{   
    const txBuilder = await getTxBuilder();
     
    const scriptFile = await readFile("./testnet/vesting.plutus.json", { encoding: "utf-8" });
    const script = Script.fromCbor(JSON.parse(scriptFile).cborHex, ScriptType.PlutusV3)
    const scriptAddr = new Address(
        "testnet",
        new Credential(CredentialType.Script, script.hash)
    );
    
    const privateKeyFile = await readFile("./testnet/payment1.skey", { encoding: "utf-8" });
    const privateKey = PrivateKey.fromCbor( JSON.parse(privateKeyFile).cborHex );
    
    const addr = await readFile("./testnet/address1.addr", { encoding: "utf-8" });
    const address = Address.fromString(addr);
    
    const publicKeyFile = await readFile("./testnet/payment2.vkey", { encoding: "utf-8" });
    const pkh = PublicKey.fromCbor( JSON.parse(publicKeyFile).cborHex ).hash;

    const utxos = await Blockfrost.addressUtxos( address )
        .catch( e => { throw new Error ("unable to find utxos at " + addr) })

    // atleast has 10 ada
    const utxo = utxos.find(utxo => utxo.resolved.value.lovelaces >= 15_000_000)!;
    if (!utxo) {
        throw new Error("No utxo with more than 10 ada");
    }

    const nowPosix = Date.now();

    let tx = await txBuilder.buildSync({
        inputs: [{ utxo: utxo }],
        collaterals: [ utxo ],
        outputs: [
            {
                address: scriptAddr,
                value: Value.lovelaces( 10_000_000 ),
                datum: VestingDatum.VestingDatum({
                    beneficiary: pBSToData.$( pByteString( pkh.toBuffer() ) ),
                    deadline: pIntToData.$( nowPosix + 10_000 )
                })
            }
        ],
        changeAddress: address
    });
    
    await tx.signWith( new PrivateKey(privateKey) );

    const submittedTx = await Blockfrost.submitTx( tx );
    console.log(submittedTx);
    
}

if( process.argv[1].includes("createVesting") )
{
    createVesting(blockfrost());
}