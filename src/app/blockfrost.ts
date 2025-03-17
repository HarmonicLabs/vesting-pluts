import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";

import dotenv from 'dotenv';
dotenv.config();

let blockfrostInstance: BlockfrostPluts | null = null;

export default function blockfrost(): BlockfrostPluts { 
    if (!blockfrostInstance) {
        const project_id = process.env.BLOCKFROST_PROJECT_ID;
        if (!project_id) {
            throw new Error("BLOCKFROST_PROJECT_ID is not set");
        }
        blockfrostInstance = new BlockfrostPluts({
            projectId: project_id,
        });
    }
    return blockfrostInstance;
}
