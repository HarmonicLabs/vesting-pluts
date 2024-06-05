import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";

function blockfrost () {
    const provider = new BlockfrostPluts({
        projectId: "Place your blockfrost API key for the project here", // see: https://blockfrost.io
    });
    return provider;
}

export default blockfrost;