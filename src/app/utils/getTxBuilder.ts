import { TxBuilder, defaultMainnetGenesisInfos } from "@harmoniclabs/buildooor";
import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";
import { Emulator } from "@harmoniclabs/pluts-emulator";
import { defaultProtocolParameters } from "@harmoniclabs/plu-ts";

// Cache for the TxBuilder to avoid redundant API calls
let cachedTxBuilder: TxBuilder | undefined = undefined;

/**
 * Creates a TxBuilder with the appropriate protocol parameters and genesis infos
 * Caches the result to avoid redundant API calls
 * @param provider Optional provider (Blockfrost or Emulator) to use for protocol parameters and genesis infos
 * @returns A configured TxBuilder instance
 */
export default async function getTxBuilder(provider?: BlockfrostPluts | Emulator): Promise<TxBuilder> {
  if (!provider) {
    console.warn("No provider passed to getTxBuilder. Using defaults which may not be suitable for mainnet/testnet transactions.");
  }
  // Return cached TxBuilder if available and no provider is specified
  if (cachedTxBuilder && !provider) {
    return cachedTxBuilder;
  }

  if (provider) {
    // Use the provided provider to get protocol parameters and genesis infos
    const [protocolParameters, genesisInfos] = await Promise.all([
      provider.getProtocolParameters(),
      provider.getGenesisInfos()
    ]);

    const txBuilder = new TxBuilder(
      protocolParameters,
      genesisInfos
    );

    // Cache the TxBuilder for future use
    if (!cachedTxBuilder) {
      cachedTxBuilder = txBuilder;
    }

    return txBuilder;
  } else {
    // Use default values if no provider is provided
    if (!cachedTxBuilder) {
      cachedTxBuilder = new TxBuilder(
        defaultProtocolParameters,
        defaultMainnetGenesisInfos
      );
    }
    
    return cachedTxBuilder;
  }
}