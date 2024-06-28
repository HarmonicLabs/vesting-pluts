import { existsSync } from "fs";
// import { cli } from "./utils/cli";
import { Address, Credential, PublicKey } from "@harmoniclabs/plu-ts";
import { config } from "dotenv";
import { mkdir, writeFile } from "fs/promises";

import pkg from 'blakejs';

const {blake2bHex } = pkg;
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

            const publicKeyBuffer = Buffer.from(publicKeyUint8Array);
            const publicKeyHash = blake2bHex(publicKeyUint8Array, undefined, 28);

            // Use the hash to create a Credential
            const pubKeyCredential = Credential.keyHash(publicKeyHash);

            const pubKeyObj = new PublicKey(publicKeyUint8Array)
            // Create the address
            // const address = new Address("testnet", pubKeyCredential);
            const address = Address.testnet(pubKeyCredential);

        // const address = new Address(
        //     "testnet",
        //     Credential.keyHash( keyPair.publicKey )
        // );

          await writeFile(`./testnet/address${i}.addr`, address.toString());
          await writeFile(`./testnet/payment${i}.vkey`, publicKeyHash.toString());
          await writeFile(`./testnet/payment${i}.skey`, keyPair.privateKey.toString());

        // console.log(publicKeyArrayBuffer, publicKeyUint8Array);
        

        // console.log(pubKeyObj.toString())
        console.log(pubKeyObj.toCbor().toString())
        
        // promises.push(
        //     cli.utils.writeAddress( addr, `./testnet/address${i}.addr` ),
        //     cli.utils.writePublicKey( publicKey, `./testnet/payment${i}.vkey` ),
        //     cli.utils.writePrivateKey( privateKey, `./testnet/payment${i}.skey` )
        // );
    }

    // wait for all files to be copied
    await Promise.all( promises );
}
genKeys();