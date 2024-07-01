import { Address, Credential, PrivateKey, Value, pBSToData, pByteString, pIntToData } from "@harmoniclabs/plu-ts";
import VestingDatum from "../VestingDatum";
import getTxBuilder from "./getTxBuilder";
import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";
import blockfrost from "./blockfrost";
import { readFile } from "fs/promises";
import { dataFromCbor } from "@harmoniclabs/plutus-data";

const hexToUint8Array = (hexString: any) => {
    if (hexString.length % 2 !== 0) {
      throw new Error("Hex string must have an even length");
    }
    const array = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
      array[i / 2] = parseInt(hexString.substr(i, 2), 16);
    }
    return array;
}

async function createVesting(Blockfrost: BlockfrostPluts)
{   
    const txBuilder = await getTxBuilder(Blockfrost);
     
    const script = await readFile("./testnet/vesting.plutus.json", { encoding: "utf-8" });

    // TBD - Fix compilation error here
    const scriptAddr = new Address(
        "testnet",
        Credential.script( dataFromCbor(JSON.parse(script).cborHex).toString() )
    );
    
    


    const privateKey = await readFile("./testnet/payment1.skey", { encoding: "utf-8" });
    const addr = await readFile("./testnet/address1.addr", { encoding: "utf-8" });
    const address = Address.fromString(addr);
    const beneficiary = await readFile("./testnet/payment2.vkey", { encoding: "utf-8" });

    const utxos = await Blockfrost.addressUtxos( address );

    if( utxos.length === 0 )
    {
        throw new Error(
            "no utxos found at address " + addr.toString()
        );
    }

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