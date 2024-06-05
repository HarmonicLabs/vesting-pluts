import { Address, DataI, Hash28, PaymentCredentials, PubKeyHash } from "@harmoniclabs/plu-ts";
import { cli } from "./utils/cli";
import getTxBuilder from "./getTxBuilder";
import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";
import blockfrost from "./blockfrost";

async function claimVesting(Blockfrost: BlockfrostPluts)
{
    const txBuilder = await getTxBuilder(Blockfrost);
    const script = cli.utils.readScript("./testnet/vesting.plutus.json");

    const scriptAddr = new Address(
        "testnet",
        PaymentCredentials.script( script.hash )
    );
    
    const payment2skey = "./testnet/payment2.skey";
    const privateKey = cli.utils.readPrivateKey(payment2skey);
    const addr = cli.utils.readAddress("./testnet/address2.addr");

    const utxos = await Blockfrost.addressUtxos( addr );
    const scriptUtxos = await Blockfrost.addressUtxos( scriptAddr );

    if( utxos.length === 0 || scriptUtxos.length === 0 )
    {
        throw new Error(
            "no utxos found at address " + addr.toString()
        );
    }

    const utxo = utxos[0];
    const pkh = privateKey.derivePublicKey().hash;

    console.log('privateKey :', privateKey)
    console.log('pkh: ', pkh)
    let tx = await txBuilder.buildSync({
        inputs: [
            { utxo: utxo },
            {
                utxo: scriptUtxos[0],
                inputScript: {
                    script: script,
                    datum: "inline",
                    redeemer: new DataI( 0 )
                }
            }
        ],
        requiredSigners: [ pkh ], // required to be included in script context
        collaterals: [ utxo ],
        changeAddress: addr
    });

    tx = await cli.transaction.sign({ tx, privateKey });

    const submittedTx = await Blockfrost.submitTx( tx );
    console.log(submittedTx);
    
}

if( process.argv[1].includes("claimVesting") )
{
    claimVesting(blockfrost());
}