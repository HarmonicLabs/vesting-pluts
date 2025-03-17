import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";
import { defaultProtocolParameters, defaultMainnetGenesisInfos, TxBuilder } from "@harmoniclabs/buildooor";
import blockfrost from "./blockfrost";
import { onEmulator } from "./utils";

/**
 * we don't want to do too many API call if we already have our `txBuilder`
 * 
 * so after the first call we'll store a copy here.
**/
let _cachedTxBuilder: TxBuilder | undefined = undefined;

export default async function getTxBuilder(): Promise<TxBuilder>
{
    if(!( _cachedTxBuilder instanceof TxBuilder )) {
        if (onEmulator()) {
            _cachedTxBuilder = new TxBuilder (defaultProtocolParameters, defaultMainnetGenesisInfos)
        }
        else {
            const Blockfrost: BlockfrostPluts = blockfrost();
            const parameters = await Blockfrost.getProtocolParameters();
            _cachedTxBuilder = new TxBuilder(parameters);
        }
    }
    return _cachedTxBuilder;
}
