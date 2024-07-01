import { existsSync } from "fs";
import { Address, Credential, PublicKey, PrivateKey, PubKeyHash } from "@harmoniclabs/plu-ts";
import { config } from "dotenv";
import { mkdir, writeFile } from "fs/promises";

import pkg from 'blakejs';
const { blake2b } = pkg;

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
        // generate keypair
        let keyPair = await globalThis.crypto.subtle.generateKey(
            {
                name: "Ed25519",
                namedCurve: "Ed25519"
              },
              true,
              ["sign", "verify"]
          );
        // From export in raw
        const publicKeyArrayBuffer = await globalThis.crypto.subtle.exportKey('raw', keyPair.publicKey);
        const publicKeyUint8Array = new Uint8Array(publicKeyArrayBuffer);
        const publicKey = new PublicKey(publicKeyUint8Array);
        const publicKeyHash = new PubKeyHash(blake2b(publicKeyUint8Array, undefined, 28));
        const pubKeyJsonObj = {
            type: "PaymentVerificationKeyShelley_ed25519",
            description: "Payment Verification Key",
            cborHex: publicKey.toCbor().toString()
        }
        console.log("\nPublic Key:",publicKey.toCbor().toString());

        const pubKeyJsonStr = JSON.stringify(pubKeyJsonObj, null, 4);
        await writeFile(`./testnet/payment${i}.vkey`, pubKeyJsonStr);

        // Export of the private key in a way that's compatible with the Cardano CLI
        const privateKeyArrayBuffer = await globalThis.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
        const privateKeyUint8Array = new Uint8Array(privateKeyArrayBuffer.slice(-32));
        const privateKey = new PrivateKey(privateKeyUint8Array);

        // Check that the derivations went fine
        const pubKeyfromPriv = privateKey.derivePublicKey();
        console.log("\nPrivate Key:",privateKey.toCbor().toString());
        console.log("\nChecking the correspondance between private and public key:")
        if (pubKeyfromPriv.toString() !== publicKey.toString()) {
            throw new Error("\tPublic key derivation from private key failed");
        }
        else {
            console.log("\tPublic key derivation from private key succeeded");
        }
  
        const pvtKeyJsonObj = {
            type: "PaymentSigningKeyShelley_ed25519",
            description: "Payment Signing Key",
            cborHex: privateKey.toCbor().toString()
        }

        const pvtKeyJsonStr = JSON.stringify(pvtKeyJsonObj, null, 4);
        await writeFile(`./testnet/payment${i}.skey`, pvtKeyJsonStr);


        // Create the address
        const credential = Credential.keyHash(publicKeyHash);
        const address = new Address("testnet", credential);
        console.log("\nAddress:",address.toString());
        await writeFile(`./testnet/address${i}.addr`, address.toString());
    }   

    // wait for all files to be copied
    await Promise.all( promises );
}
genKeys();