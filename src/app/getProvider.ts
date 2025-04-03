import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";
import { ITxRunnerProvider, IGetProtocolParameters, ISubmitTx } from "@harmoniclabs/plu-ts";
import blockfrost from "./blockfrost";
import { Emulator } from "./package";

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
    // Create and return an emulator instance with optional settings
    return new Emulator(
      initialSettings?.initialUtxos || [], 
      undefined, // Use default genesis infos
      undefined, // Use default protocol parameters
      initialSettings?.debugLevel ?? 1 // Default debug level is 1
    );
  } else {
    console.log("Using Blockfrost");
    // Return Blockfrost provider
    return blockfrost();
  }
}