import { Address, Credential, PrivateKey, Value, pBSToData, pByteString, pIntToData, CredentialType, PublicKey, Script, ScriptType, IProvider } from "@harmoniclabs/plu-ts";
import VestingDatum from "../VestingDatum";
import getTxBuilder from "./getTxBuilder";
import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";
import blockfrost from "./blockfrost";
import { readFile } from "fs/promises";
import { Emulator } from "./package";

/**
 * Creates a vesting contract transaction
 * @param provider The provider to use (Blockfrost or Emulator)
 * @returns The transaction hash
 */
export async function createVesting(provider: BlockfrostPluts | Emulator): Promise<string> {   
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
    console.log(`Public key hash: ${pkh.toString()}`);
    const utxos = await provider.addressUtxos(address)
        .catch(e => { throw new Error(`Unable to find UTxOs at ${addr}: ${e.message}`) });
    // At least has 15 ADA
    const utxo = utxos.find(utxo => utxo.resolved.value.lovelaces >= 15_000_000);
    if (!utxo) {
        throw new Error(`No UTxO with more than 15 ADA at address ${address}`);
    }

    let deadline: number;
    // Should this be more consistent
    // When I get the Tx validation from Michele, I'll make this better
    if (provider instanceof Emulator) {
        deadline = provider.getChainTip().slot + 10;
    } else {
        const nowPosix = Date.now();
        deadline = (nowPosix + 10_000 )
    }

    let tx = await txBuilder.buildSync({
        inputs: [{ utxo: utxo }],
        collaterals: [utxo],
        outputs: [
            {
                address: scriptAddr,
                value: Value.lovelaces(5_000_000),
                datum: VestingDatum.VestingDatum({
                    beneficiary: pBSToData.$(pByteString(pkh.toBuffer())),
                    deadline: pIntToData.$(deadline)
                })
            }
        ],
        changeAddress: address
    });
    
    await tx.signWith(privateKey);

    const submittedTx = await provider.submitTx(tx);
    console.log(`Vesting transaction submitted: ${submittedTx}`);
    console.log(`Vesting deadline set to: ${new Date(deadline).toISOString()}`);
    
    return submittedTx;
}