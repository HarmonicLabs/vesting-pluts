// import { TxBuilder } from "@harmoniclabs/plu-ts";
import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";

import { defaultProtocolParameters, defaultMainnetGenesisInfos, TxBuilder } from "@harmoniclabs/buildooor";
// import { Emulator } from "@harmoniclabs/pluts-emulator";

/**
 * we don't want to do too many API call if we already have our `txBuilder`
 * 
 * so after the first call we'll store a copy here.
**/
let _cachedTxBuilder: TxBuilder | undefined = undefined

// export default async function getTxBuilder(Blockfrost: BlockfrostPluts): Promise<TxBuilder>
// {
//     if(!( _cachedTxBuilder instanceof TxBuilder ))
//     {
//         const parameters = await Blockfrost.getProtocolParameters();
//         _cachedTxBuilder = new TxBuilder(parameters);
//     }

//     return _cachedTxBuilder;
// }

export default async function getTxBuilder(): Promise<TxBuilder>
{
    if(!( _cachedTxBuilder instanceof TxBuilder ))
    {
        _cachedTxBuilder = new TxBuilder (defaultProtocolParameters, defaultMainnetGenesisInfos)
    }

    return _cachedTxBuilder;
}