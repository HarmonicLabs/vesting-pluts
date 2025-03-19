import {DataB, DataConstr, DataI, pBSToData, pByteString, pIntToData} from '@harmoniclabs/plu-ts';
import { Address, Credential, Hash28, PrivateKey, Value, CredentialType, PublicKey, Script, ScriptType } from "@harmoniclabs/plu-ts"; //, defaultMainnetGenesisInfos, TxBuilder   "@harmoniclabs/plu-ts";
import { defaultPreprodGenesisInfos } from "@harmoniclabs/buildooor";
import { readFile } from "fs/promises";

import VestingDatum from "../../VestingDatum";
import getTxBuilder from "../getTxBuilder";
import { getEmulatorInstance } from "./emulatorInstance";

(async () => {
    const txBuilder = await getTxBuilder();
    const emulator = await getEmulatorInstance();


    async function createVesting() 
    {   
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

        let utxos = emulator.getAddressUtxos(address)
        const utxo = utxos?.find(utxo => utxo.resolved.value.lovelaces >=15_000_000);
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
                        deadline: pIntToData.$( emulator.getCurrentTime() + 5_000 ) //pIntToData.$( nowPosix + 10_000 )
                    })
                }
            ],
            changeAddress: address
        });
        
        await tx.signWith( new PrivateKey(privateKey) );

        const submittedTx = await emulator.submitTx( tx );

        console.log('in Create, submittedTx: ', submittedTx);

        emulator.awaitBlock(1)
    }


    async function claimVesting()
    {
        const scriptFile = await readFile("./testnet/vesting.plutus.json", { encoding: "utf-8" });
        const script = Script.fromCbor(JSON.parse(scriptFile).cborHex, ScriptType.PlutusV3)
        const scriptAddr = new Address(
            "testnet",
            new Credential(CredentialType.Script, script.hash)
        );
        
        const privateKeyFile = await readFile("./testnet/payment2.skey", { encoding: "utf-8" });
        const privateKey = PrivateKey.fromCbor( JSON.parse(privateKeyFile).cborHex );

        const addr = await readFile("./testnet/address2.addr", { encoding: "utf-8" });
        const address = Address.fromString(addr);

        const publicKeyFile = await readFile("./testnet/payment2.vkey", { encoding: "utf-8" });
        const pkh = PublicKey.fromCbor( JSON.parse(publicKeyFile).cborHex ).hash;
        
        let utxos = emulator.getAddressUtxos(address)

        const utxo = utxos?.find(utxo => utxo.resolved.value.lovelaces >=15_000_000);
        if (!utxo) {
            throw new Error("No UTxO with at least 15 ADA found");
        }
        
        let scriptUtxos = emulator.getAddressUtxos(scriptAddr)
        
        if (!scriptUtxos) {
            throw new Error("unable to find utxos at " + addr);
        }

        // matches with the pkh
        const scriptUtxo = scriptUtxos.find(utxo => {
            if (utxo.resolved.datum instanceof DataConstr) { 
            const pkhData = utxo.resolved.datum.fields[0]; 
            if (pkhData instanceof DataB) {
                return pkh.toString() == Buffer.from( pkhData.bytes.toBuffer() ).toString("hex")
            }
            }
            return false; 
        });
        if (!scriptUtxo) {  
            throw new Error ("No script utxo found for the pkh")
        }

        txBuilder.setGenesisInfos( defaultPreprodGenesisInfos )

        if (Buffer.from(script.hash.toBuffer()).toString("hex") !== Buffer.from(scriptAddr.paymentCreds.hash.toBuffer()).toString("hex")) {
            throw new Error("Script hash and script address hash do not match");
        }

        let tx = await txBuilder.buildSync({
            inputs: [
                { utxo: utxo },
                {
                    utxo: scriptUtxo,
                    inputScript: {
                        script: script,
                        datum: "inline",
                        redeemer: new DataI( 0 )
                    }
                }
            ],
            requiredSigners: [ pkh ], // required to be included in script context
            collaterals: [ utxo ],
            changeAddress: address,
            invalidBefore: emulator.getCurrentTime()
        });

        await tx.signWith( privateKey )

        const submittedTx = await emulator.submitTx( tx ) ;
        
        console.log('in Claim, submittedTx: ',submittedTx);
        
        emulator.awaitBlock(1);

    }

    await createVesting();
    await emulator.awaitBlock(5);
    await claimVesting();

})()