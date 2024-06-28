import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";

function blockfrost () {
    const provider = new BlockfrostPluts({
        projectId: "test"
    });
    return provider;
}

export default blockfrost;