import { existsSync } from "fs";
import { Address, Credential, PublicKey, PrivateKey, PubKeyHash } from "@harmoniclabs/plu-ts";
import { config } from "dotenv";
import { mkdir, writeFile } from "fs/promises";
import { blake2b } from 'blakejs';

// Load environment variables
config();

/**
 * Generate Cardano keys and addresses for testing
 * @param numKeys Number of key pairs to generate
 * @param outputDir Directory to store the generated keys and addresses
 */
export async function genKeys(numKeys = 2, outputDir = "./testnet") {
  try {
    console.log(`Generating ${numKeys} key pairs in ${outputDir}`);
    
    // Create output directory if it doesn't exist
    if (!existsSync(outputDir)) {
      console.log(`Creating directory: ${outputDir}`);
      await mkdir(outputDir, { recursive: true });
    }
    
    for (let i = 1; i <= numKeys; i++) {
      console.log(`\nGenerating key pair ${i} of ${numKeys}...`);
      
      try {
        // Generate Ed25519 key pair
        const keyPair = await globalThis.crypto.subtle.generateKey(
          {
            name: "Ed25519",
            namedCurve: "Ed25519"
          },
          true,
          ["sign", "verify"]
        );
        
        // Process public key
        console.log(`  Processing public key ${i}...`);
        const publicKeyArrayBuffer = await globalThis.crypto.subtle.exportKey('raw', keyPair.publicKey);
        const publicKeyUint8Array = new Uint8Array(publicKeyArrayBuffer);
        const publicKey = new PublicKey(publicKeyUint8Array);
        const publicKeyHash = new PubKeyHash(blake2b(publicKeyUint8Array, undefined, 28));
        
        // Create and save public key file
        const pubKeyJsonObj = {
          type: "PaymentVerificationKeyShelley_ed25519",
          description: "Payment Verification Key",
          cborHex: publicKey.toCbor().toString()
        };
        const pubKeyPath = `${outputDir}/payment${i}.vkey`;
        await writeFile(pubKeyPath, JSON.stringify(pubKeyJsonObj, null, 2));
        console.log(`  Public key saved to: ${pubKeyPath}`);
        
        // Process private key
        console.log(`  Processing private key ${i}...`);
        const privateKeyArrayBuffer = await globalThis.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
        
        // Get the last 32 bytes which is the actual private key in Ed25519
        const privateKeyUint8Array = new Uint8Array(privateKeyArrayBuffer.slice(-32));
        const privateKey = new PrivateKey(privateKeyUint8Array);
        
        // Create and save private key file
        const pvtKeyJsonObj = {
          type: "PaymentSigningKeyShelley_ed25519",
          description: "Payment Signing Key",
          cborHex: privateKey.toCbor().toString()
        };
        const privateKeyPath = `${outputDir}/payment${i}.skey`;
        await writeFile(privateKeyPath, JSON.stringify(pvtKeyJsonObj, null, 2));
        console.log(`  Private key saved to: ${privateKeyPath}`);
        
        // Verify key derivation
        const derivedPublicKey = privateKey.derivePublicKey();
        if (derivedPublicKey.toString() !== publicKey.toString()) {
          throw new Error("Public key derivation from private key failed");
        }
        console.log(`  Verified: Public key correctly derived from private key`);
        
        // Create and save address
        const credential = Credential.keyHash(publicKeyHash);
        const address = new Address("testnet", credential);
        const addressPath = `${outputDir}/address${i}.addr`;
        await writeFile(addressPath, address.toString());
        console.log(`  Address saved to: ${addressPath}`);
        
      } catch (error) {
        console.error(`Error generating key pair ${i}:`, error);
        
      }
    }
    
    console.log(`\nSuccessfully generated ${numKeys} key pairs in ${outputDir}`);
  } catch (error) {
    console.error("Key generation failed:", error);
    process.exit(1);
  }
}

// Allow command line arguments to specify the number of keys
const numKeys = process.argv[2] ? parseInt(process.argv[2]) : 2;

// Execute the function
genKeys(numKeys);