// import { Address, Credential, Value, pBSToData, pByteString, pIntToData } from "@harmoniclabs/plu-ts";
// import { cli } from "./utils/cli";
// import VestingDatum from "../VestingDatum";
// import getTxBuilder from "./getTxBuilder";
// import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";
// import blockfrost from "./blockfrost";

// async function createVesting(Blockfrost: BlockfrostPluts)
// {   
//     const txBuilder = await getTxBuilder(Blockfrost);
     
//     const script = cli.utils.readScript("./testnet/vesting.plutus.json");

//     const scriptAddr = new Address(
//         "testnet",
//         Credential.script( script.hash )
//     );
    
//     const privateKey = cli.utils.readPrivateKey("./testnet/payment1.skey");
//     const addr = cli.utils.readAddress("./testnet/address1.addr");
//     const beneficiary = cli.utils.readPublicKey("./testnet/payment2.vkey");

//     const utxos = await Blockfrost.addressUtxos( addr );

//     if( utxos.length === 0 )
//     {
//         throw new Error(
//             "no utxos found at address " + addr.toString()
//         );
//     }

//     const utxo = utxos[0];

//     const nowPosix = Date.now();

//     let tx = await txBuilder.buildSync({
//         inputs: [{ utxo: utxo }],
//         collaterals: [ utxo ],
//         outputs: [
//             {
//                 address: scriptAddr,
//                 value: Value.lovelaces( 10_000_000 ),
//                 datum: VestingDatum.VestingDatum({
//                     beneficiary: pBSToData.$( pByteString( beneficiary.hash.toBuffer() ) ),
//                     deadline: pIntToData.$( nowPosix + 10_000 )
//                 })
//             }
//         ],
//         changeAddress: addr
//     });
    
//     tx = await cli.transaction.sign({ tx, privateKey });

//     const submittedTx = await Blockfrost.submitTx( tx );
//     console.log(submittedTx);
    
// }

// if( process.argv[1].includes("createVesting") )
// {
//     createVesting(blockfrost());
// }