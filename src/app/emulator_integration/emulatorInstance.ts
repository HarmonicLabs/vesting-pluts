import { Address, IUTxO, defaultProtocolParameters } from "@harmoniclabs/plu-ts";
import { defaultMainnetGenesisInfos } from "@harmoniclabs/buildooor"
import { Emulator, experimentFunctions } from "@harmoniclabs/pluts-emulator";
import { readFile } from "fs/promises";

async function initializeEmulator(): Promise<Emulator> {
    const addr1 = await readFile("./testnet/address1.addr", { encoding: "utf-8" });
    const address1 = Address.fromString(addr1);

    const addr2 = await readFile("./testnet/address2.addr", { encoding: "utf-8" });
    const address2 = Address.fromString(addr2);

    const utxosInit: IUTxO[] = [];

    const utxoHash1 = experimentFunctions.generateRandomTxHash(1);
    const utxo1: IUTxO = experimentFunctions.createInitialUTxO(15000000n, address1, utxoHash1);
    utxosInit.push(utxo1);

    const utxoHash2 = experimentFunctions.generateRandomTxHash(2);
    const utxo2: IUTxO = experimentFunctions.createInitialUTxO(15000000n, address2, utxoHash2);
    utxosInit.push(utxo2);

    console.log(addr1, addr2)
    return new Emulator(utxosInit, defaultMainnetGenesisInfos, defaultProtocolParameters);
}

let emulatorInstance: Emulator | null = null;

export async function getEmulatorInstance(): Promise<Emulator> {
    if (!emulatorInstance) {
        emulatorInstance = await initializeEmulator();
    }
    return emulatorInstance;
}