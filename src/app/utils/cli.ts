import { CardanoCliPluts } from "@harmoniclabs/cardanocli-pluts";
import { config } from "dotenv";

config()

export const cli = new CardanoCliPluts({
    network: "testnet 1", // 1 for preprod, 2 for preview
    // socketPath: (process.env.PRIVATE_TESTNET_PATH ?? ".") + "/node-spo1/node.sock"
});