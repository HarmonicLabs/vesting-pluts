import { Address, DataI, Credential, PubKeyHash } from "@harmoniclabs/plu-ts";
import getTxBuilder from "./getTxBuilder";
import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";
import blockfrost from "./blockfrost";
import { readFile } from "fs/promises";

async function claimVesting(Blockfrost: BlockfrostPluts)
{
    const txBuilder = await getTxBuilder(Blockfrost);
    const script = await readFile("./testnet/vesting.plutus.json", { encoding: "utf-8" });

    const scriptAddr = new Address(
        "testnet",
        Credential.script( JSON.parse(script).hash )
    );
    
    const privateKey = await readFile("./testnet/payment2.skey", { encoding: "utf-8" });
    const privateKeyJSON = JSON.parse(privateKey).cborHex();
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
    const pkh = new PubKeyHash(privateKeyJSON.derivePublicKey().hash);

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

    await tx.signWith( privateKeyJSON )

    const submittedTx = await Blockfrost.submitTx( tx );
    console.log(submittedTx);
    
}

if( process.argv[1].includes("claimVesting") )
{
    claimVesting(blockfrost());
}