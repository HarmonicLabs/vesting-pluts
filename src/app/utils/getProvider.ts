import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";
import { Emulator } from "@harmoniclabs/pluts-emulator";

/**
 * Creates a Blockfrost provider instance
 * @returns BlockfrostPluts provider
 */
function createBlockfrostProvider(): BlockfrostPluts {
    const provider = new BlockfrostPluts({
        projectId: "preprodKRzuHe6HynTdTaMYXBJUq3DUwsTATXjx"
    });
    return provider;
}

/**
 * Creates an Emulator provider instance
 * @param initialSettings Optional settings for the emulator
 * @returns Emulator provider
 * TODO: use initializeEmulator from Emulator in the return statement
 */
export function createEmulatorProvider(
    initialSettings?: {
        initialUtxos?: any[],
        debugLevel?: number
    }
): Emulator {
    return new Emulator(
        initialSettings?.initialUtxos || [], 
        undefined, // Use default genesis infos
        undefined, // Use default protocol parameters
        initialSettings?.debugLevel ?? 0 // Default debug level is 0
    );
}

/**
 * Factory function that returns the appropriate provider based on configuration
 * @param useEmulator Whether to use the emulator instead of Blockfrost
 * @param initialSettings Optional settings for the emulator (only used when useEmulator is true)
 * @returns Either BlockfrostPluts or Emulator instance
 */
export function getProvider(
    useEmulator: boolean = false,
    initialSettings?: {
        initialUtxos?: any[],
        debugLevel?: number
    }
): BlockfrostPluts | Emulator {
    if (useEmulator) {
        console.log("Using Emulator");
        return createEmulatorProvider(initialSettings);
    } else {
        console.log("Using Blockfrost - ensure your addresses have been funded with a faucet");
        return createBlockfrostProvider();
    }
}

/**
 * Default provider - uses Blockfrost
 * Maintained for backward compatibility with existing code
 */
export default function blockfrost(): BlockfrostPluts {
    return createBlockfrostProvider();
}