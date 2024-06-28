import { existsSync } from "fs";
// import { cli } from "./utils/cli";
import { Address, Credential, PublicKey, PrivateKey, PubKeyHash } from "@harmoniclabs/plu-ts";
import { config } from "dotenv";
import { mkdir, writeFile } from "fs/promises";

import pkg from 'blakejs';
import { json } from "stream/consumers";

const {blake2bHex, blake2b } = pkg;
config();

async function genKeys()
{
    const nKeys = 2;

    const promises: Promise<any>[] = [];

    if( !existsSync("./testnet") )
    {
        await mkdir("./testnet");
    }
    
    for( let i = 1; i <= nKeys; i++ )
    {
        // const { privateKey, publicKey } = await cli.address.keyGen();
        
        // generate keypair
        let keyPair = await globalThis.crypto.subtle.generateKey(
            {
                name: "Ed25519",
                namedCurve: "Ed25519"
              },
              true,
              ["sign", "verify"]
          );
          
        const publicKeyArrayBuffer = await globalThis.crypto.subtle.exportKey('raw', keyPair.publicKey);
        const publicKeyUint8Array = new Uint8Array(publicKeyArrayBuffer);
        const publicKey = new PublicKey(publicKeyUint8Array);
        const publicKeyHash = new PubKeyHash(blake2b(publicKeyUint8Array, undefined, 28));

        const pubKeyJsonObj = {
            type: "PaymentVerificationKeyShelley_ed25519",
            description: "Payment Verification Key",
            cborHex: publicKey.toCbor().toString()
        }

        const pubKeyJsonStr = JSON.stringify(pubKeyJsonObj, null, 4);
        await writeFile(`./testnet/payment_tests${i}.vkey`, pubKeyJsonStr);

        const privateKeyArrayBuffer = await globalThis.crypto.subtle.exportKey('raw', keyPair.privateKey);
        const privateKeyUint8Array = new Uint8Array(privateKeyArrayBuffer);
        const privateKey = new PrivateKey(privateKeyUint8Array);

        const pvtKeyJsonObj = {
            type: "PaymentSigningKeyShelley_ed25519",
            description: "Payment Signing Key",
            cborHex: privateKey.toCbor().toString()
        }

        const pvtKeyJsonStr = JSON.stringify(pvtKeyJsonObj, null, 4);
        await writeFile(`./testnet/payment_tests${i}.skey`, pvtKeyJsonStr);

        console.log(publicKey.toCbor().toString()); 
        
        // Create the address
        const credential = Credential.keyHash(publicKeyHash);
        const address = new Address("testnet", credential);
        console.log(address.toString());
        
    }

    // wait for all files to be copied
    await Promise.all( promises );
}
genKeys();