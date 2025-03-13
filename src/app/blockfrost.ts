import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";

function blockfrost () {
    const provider = new BlockfrostPluts({
        projectId: "preprodQvxYeuM9m6aAIcean8oNAPSGOFoYKHVa" //"previewjAJpYnCrWS07h55R8Udg9W3Nw55xhaRt"
    });
    return provider;
}

export default blockfrost;

// import { Emulator } from "@harmoniclabs/pluts-emulator";

// function blockfrost() {
//     const provider = new Emulator();
//     return provider;
// }

// export default blockfrost;