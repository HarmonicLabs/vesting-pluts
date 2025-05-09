import { Address, Credential, PrivateKey, Value, pBSToData, pByteString, pIntToData, CredentialType, PublicKey, Script, ScriptType, IProvider } from "@harmoniclabs/plu-ts";
import VestingDatum from "../../VestingDatum";
import getTxBuilder from "../utils/getTxBuilder";
import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";
import { readFile } from "fs/promises";
import { Emulator } from "@harmoniclabs/pluts-emulator";

/**
 * Creates a vesting contract transaction
 * @param provider The provider to use (Blockfrost or Emulator)
 * @returns The transaction hash
 */
export async function createVesting(provider: BlockfrostPluts | Emulator): Promise<string> {   
    const txBuilder = await getTxBuilder(provider);
     
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
    const utxos = await provider.addressUtxos(address)
        .catch(e => { throw new Error(`Unable to find UTxOs at ${addr}: ${e.message}`) });
    // At least has 15 ADA
    const utxo = utxos.find(utxo => utxo.resolved.value.lovelaces >= 15_000_000);
    if (!utxo) {
        throw new Error(`No UTxO with more than 15 ADA at address ${address}`);
    }

    const chainTip = await provider.getChainTip();
    const deadline = txBuilder.slotToPOSIX(chainTip.slot! + 900_000); //convert to units POSIX

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
    console.log(`Vesting deadline set to: ${deadline} - ${new Date(deadline).toISOString()}`);
    
    return submittedTx;
}