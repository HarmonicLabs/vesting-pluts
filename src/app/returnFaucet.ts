// import { PrivateKey, TxOutRef } from "@harmoniclabs/plu-ts";
// import { cli } from "./utils/cli";

// async function returnFaucet()
// {
//     const utxos: { utxo: TxOutRef }[] = [];
//     const prvtKeys: PrivateKey[] = [];
    
//     for( let i = 1; i <= 2; i++ )
//     {
//         prvtKeys.push( cli.utils.readPrivateKey(`./testnet/payment${i}.skey`) );
//         const addr = cli.utils.readAddress(`./testnet/address${i}.addr`);
        
//         utxos.push(
//             ...(await cli.query.utxo({ address: addr }))
//             .map( ({ utxoRef }) => ({ utxo: utxoRef } ))
//         );
//     }

//     let returnTADA = await cli.transaction.build({
//         inputs: utxos as any,
//         // the faucet address
//         changeAddress: "addr_test1qqr585tvlc7ylnqvz8pyqwauzrdu0mxag3m7q56grgmgu7sxu2hyfhlkwuxupa9d5085eunq2qywy7hvmvej456flknswgndm3"
//     });

//     for(const privateKey of prvtKeys)
//     {
//         returnTADA = await cli.transaction.sign({ tx: returnTADA, privateKey });
//     }

//     await cli.transaction.submit({ tx: returnTADA });
// }
// if( process.argv[1].includes("returnFaucet") )
// {
//     returnFaucet();
// }