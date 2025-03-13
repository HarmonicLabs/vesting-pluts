import { defaultProtocolParameters, Tx, IUTxO, UTxO, Value, IValueAdaEntry, Address, AddressStr } from "@harmoniclabs/cardano-ledger-ts"
import { defaultMainnetGenesisInfos, TxBuilder } from "@harmoniclabs/plu-ts-offchain"
import { getRandomValues } from "crypto"
import { generateRandomBech32Address } from "./utils/helper"
import { Emulator } from "./Emulator"

// const utxosInit: IUTxO[] = createRandomInitialUtxos(2)

// const emulator: Emulator = new Emulator(utxosInit, defaultMainnetGenesisInfos, defaultProtocolParameters);

// const txBuilder = new TxBuilder (defaultProtocolParameters, defaultMainnetGenesisInfos)

// // Get the first utxo
// const utxo = emulator.getUtxos().values().next().value
// if (utxo === undefined) {
//     console.log("No utxo found")
//     process.exit(1)
// }
// // emulator.printUtxo(utxo)
// let tx = txBuilder.buildSync({
//     inputs: [utxo],
//     outputs: [],
//     changeAddress: utxo.resolved.address,
// });

// // Sign the transaction

// const submittedTx = emulator.submitTx(tx)

// console.log(submittedTx)
// console.log("UTxO Ref ID:", utxo.utxoRef.id.toString());
// emulator.printMempool()

// emulator.awaitBlock(1)

// console.log("This mempool should be emptied")
// emulator.printMempool()
// console.log("End of mempool to check")
// // emulator.printUtxos(emulator.getUtxos())


/**
 * Create a list of random UTxOs with dynamically calculated ADA values based on transaction size
 * @param numUtxos number of random utxos to create
 * @param targetAmount lovelaces which has to be populated in the address
 * @param debugLevel to further check if the tx is a valid tx falling within the limits
 * @returns utxos list
 */
function createRandomInitialUtxos(
    numUtxos: number, 
    targetAmount: bigint = 150000000n,
    debugLevel: number = 1
): IUTxO[] {

    const utxos: IUTxO[] = [];

    for (let i = 0; i < numUtxos; i++) {
        const utxoHash = generateRandomTxHash(i); // Unique hash per UTxO
        const address = generateRandomBech32Address();

        const utxoInit: IUTxO = createInitialUTxO(targetAmount, address, utxoHash);

        // const txSize = BigInt(new UTxO(utxoInit).toCbor().toBuffer().length);

        // const maxTxSizeBytes = emulator.getTxMaxSize();
        // if (txSize <= BigInt(maxTxSizeBytes)) {
            utxos.push(utxoInit);
        //     if (debugLevel > 1) {
        //         console.log(UTxO ${utxoHash} added with size ${txSize} bytes.);
        //     }
        // } else {
        //     if (debugLevel > 0) {
        //         console.warn(UTxO ${utxoHash} skipped due to size (${txSize} bytes) exceeding the limit (${maxTxSizeBytes} bytes).);
        //     }
        // }
    }

    // if (debugLevel > 0) {
    //     console.log(${utxos.length}/${numUtxos} UTxOs successfully created within size limits.);
    // }

    return utxos;
}

function createInitialUTxO(numAda: bigint, address: Address | AddressStr, id: string): IUTxO {
    const adaEntry: IValueAdaEntry = Value.lovelaceEntry(numAda);
    return new UTxO({
        utxoRef: { id: id, index: 0 },
        resolved: {
            address: address,
            value: new Value([adaEntry]),
            datum: undefined,
            refScript: undefined,
        },
    });
}



/**
 * Generate a unique random transaction hash.
 * 
 * @param index Index to ensure uniqueness.
 * @returns A random Tx hash.
 */
function generateRandomTxHash(index: number): string {
    const randomHash = getRandomValues(new Uint8Array(32));
    randomHash[0] = index; // Ensure uniqueness by incorporating the index
    return Buffer.from(randomHash).toString("hex");
}

export const experimentFunctions = {
    createRandomInitialUtxos,
    createInitialUTxO,
    generateRandomTxHash
};