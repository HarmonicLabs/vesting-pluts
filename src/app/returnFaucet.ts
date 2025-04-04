import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";
import { Address, ITxBuildInput, IUTxO, PrivateKey } from "@harmoniclabs/plu-ts";
import { readFile } from "fs/promises";
import { Emulator } from "./package/";
import getTxBuilder from "./getTxBuilder";
import blockfrost  from "./getProvider";

async function returnFaucet()
{
    const Blockfrost: BlockfrostPluts = blockfrost();
    const utxos: (ITxBuildInput | IUTxO)[] = [];
    const pvtKeys: PrivateKey[] = [];
    
    for( let i = 1; i <= 2; i++ )
    {
        const pvtKeyFile = await readFile(`./testnet/payment${i}.skey`, { encoding: "utf-8" })
        const pvtKey = PrivateKey.fromCbor( JSON.parse(pvtKeyFile).cborHex );
        pvtKeys.push( pvtKey );

        const addr = await readFile(`./testnet/address${i}.addr`, { encoding: "utf-8" });
        const address = Address.fromString(addr);

        const addrUtxos = await Blockfrost.addressUtxos( address )
        addrUtxos.forEach( utxo => utxos.push({ utxo: utxo }) )
    }


    const txBuilder = await getTxBuilder();

    let returnTADATx = await txBuilder.buildSync({
        inputs: utxos as any,
        // the faucet address
        changeAddress: "addr_test1qqr585tvlc7ylnqvz8pyqwauzrdu0mxag3m7q56grgmgu7sxu2hyfhlkwuxupa9d5085eunq2qywy7hvmvej456flknswgndm3"
    });

    for(const privateKey of pvtKeys)
    {
        await returnTADATx.signWith( privateKey );
    }

    const submittedTx = await Blockfrost.submitTx( returnTADATx );
    console.log(submittedTx);
}
if( process.argv[1].includes("returnFaucet"))
{
    returnFaucet();
}