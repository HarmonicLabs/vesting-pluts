import { Address, Credential, Hash28, PrivateKey, Value, pBSToData, pByteString, pIntToData, CredentialType } from "@harmoniclabs/plu-ts";
import VestingDatum from "../VestingDatum";
import getTxBuilder from "./getTxBuilder";
import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";
import blockfrost from "./blockfrost";
import { readFile } from "fs/promises";
import { hexToUint8Array } from "./utils";
import pkg from 'blakejs';
const { blake2b } = pkg;

async function createVesting(Blockfrost: BlockfrostPluts)
{   
    const txBuilder = await getTxBuilder(Blockfrost);
     
    const script = await readFile("./testnet/vesting.plutus.json", { encoding: "utf-8" });
    const hashScript = new Hash28(blake2b(hexToUint8Array(JSON.parse(script).cborHex), undefined, 28), undefined);

    const scriptAddr = new Address(
        "testnet",
        new Credential(CredentialType.Script, hashScript)
    );
    
    const privateKeyFile = await readFile("./testnet/payment1.skey", { encoding: "utf-8" });
    const privateKey = PrivateKey.fromCbor( JSON.parse(privateKeyFile).cborHex );
    const addr = await readFile("./testnet/address1.addr", { encoding: "utf-8" });
    const address = Address.fromString(addr);
    const beneficiary = await readFile("./testnet/payment2.vkey", { encoding: "utf-8" });

    const utxos = await Blockfrost.addressUtxos( address );
    // throw new Error(
    //     "no utxos found at address " + addr
    // );

    const utxo = utxos[0];

    const nowPosix = Date.now();

    let tx = await txBuilder.buildSync({
        inputs: [{ utxo: utxo }],
        collaterals: [ utxo ],
        outputs: [
            {
                address: scriptAddr,
                value: Value.lovelaces( 10_000_000 ),
                datum: VestingDatum.VestingDatum({
                    beneficiary: pBSToData.$( pByteString( Buffer.from(beneficiary, 'hex') ) ),
                    deadline: pIntToData.$( nowPosix + 20 )
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