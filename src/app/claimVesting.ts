import { Address, DataI, Credential, PubKeyHash, PrivateKey, CredentialType, Hash28 } from "@harmoniclabs/plu-ts";
import getTxBuilder from "./getTxBuilder";
import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";
import blockfrost from "./blockfrost";
import { readFile } from "fs/promises";
import { hexToUint8Array } from "./utils";
import pkg from 'blakejs';
const { blake2b } = pkg;

async function claimVesting(Blockfrost: BlockfrostPluts)
{
    const txBuilder = await getTxBuilder(Blockfrost);

    const script = await readFile("./testnet/vesting.plutus.json", { encoding: "utf-8" });
    const hashScript = new Hash28(blake2b(hexToUint8Array(JSON.parse(script).cborHex), undefined, 28), undefined);
    const scriptAddr = new Address(
        "testnet",
        new Credential(CredentialType.Script, hashScript)
    );

    const privateKeyFile = await readFile("./testnet/payment2.skey", { encoding: "utf-8" });
    const privateKey = PrivateKey.fromCbor( JSON.parse(privateKeyFile).cborHex );
    const addr = await readFile("./testnet/address2.addr", { encoding: "utf-8" });
    const address = Address.fromString(addr);

    const utxos = await Blockfrost.addressUtxos( address );
    const scriptUtxos = await Blockfrost.addressUtxos( scriptAddr );

    if( utxos.length === 0 || scriptUtxos.length === 0 )
    {
        throw new Error(
            "no utxos found at address " + addr.toString()
        );
    }

    const utxo = utxos[0];
    const pkh = new PubKeyHash(privateKey.derivePublicKey().hash);

    txBuilder.setGenesisInfos( await Blockfrost.getGenesisInfos() )

    let tx = await txBuilder.buildSync({
        inputs: [
            { utxo: utxo },
            {
                utxo: scriptUtxos[0],
                inputScript: {
                    script: JSON.parse(script),
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