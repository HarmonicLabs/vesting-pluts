import {pBSToData, pByteString, pIntToData} from '@harmoniclabs/plu-ts';
import { Address, Credential, Hash28, PrivateKey, Value, CredentialType, PublicKey, Script, ScriptType } from "@harmoniclabs/plu-ts"; //, defaultMainnetGenesisInfos, TxBuilder   "@harmoniclabs/plu-ts";
import VestingDatum from "../VestingDatum";
import getTxBuilder from "./getTxBuilder";
import { readFile } from "fs/promises";
import { getEmulatorInstance } from "./emulatorInstance";
import { onEmulator } from './utils';
import { BlockfrostPluts } from '@harmoniclabs/blockfrost-pluts';
import blockfrost from './blockfrost';

async function createVesting()
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

    let utxos = undefined;
    const emulator = await getEmulatorInstance();
    const Blockfrost: BlockfrostPluts = blockfrost();

    if (onEmulator()) {
        utxos = emulator.getAddressUtxos(address)
    } else {
        utxos = await Blockfrost.addressUtxos( address )
            .catch( e => { throw new Error ("unable to find utxos at " + addr) })
    }
console.log('utxos: ', utxos)
    const utxo = utxos?.find(utxo => utxo.resolved.value.lovelaces >=15_000_000); console.log('utxo: ', utxo)
    if (!utxo) {
        throw new Error("No UTxO with at least 15 ADA found");
    }

    const nowPosix = Date.now();

    let tx = await txBuilder.buildSync({
        inputs: [{ utxo: utxo }],
        collaterals: [ utxo ],
        outputs: [
            {
                address: scriptAddr,
                value: Value.lovelaces( 5_000_000 ),
                datum: VestingDatum.VestingDatum({
                    beneficiary: pBSToData.$( pByteString( pkh.toBuffer() ) ),
                    deadline: pIntToData.$( nowPosix + 10_000 )
                })
            }
        ],
        changeAddress: address
    });
    
    await tx.signWith( new PrivateKey(privateKey) );

    const submittedTx = onEmulator() ? await emulator.submitTx( tx ) : await Blockfrost.submitTx( tx );

    console.log('submittedTx: ', submittedTx);

    onEmulator() && emulator.awaitBlock(1)
}

if( process.argv[1].includes("createVesting") )
{
    createVesting()
}