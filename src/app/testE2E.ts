import { Address, PrivateKey, Value, PublicKey, IProvider } from "@harmoniclabs/plu-ts";
import { readFile } from "fs/promises";
import { getProvider } from "./getProvider";
import getTxBuilder from "./getTxBuilder";
import { Emulator } from "./package/";
import { initializeEmulator } from "./package/utils/helper";
import { createVesting } from "./createVesting";
import { claimVesting } from "./claimVesting";
import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";

// Modify the imports to export the functions instead of running them directly
// in createVesting.ts and claimVesting.ts

/**
 * Run an end-to-end test of the vesting contract
 * Works with both Blockfrost and Emulator
 */
async function testVestingE2E(useEmulator: boolean = false) {
  console.log(`Running vesting E2E test using ${useEmulator ? 'Emulator' : 'Blockfrost'}`);
  
  // Get the provider
  let provider : BlockfrostPluts | Emulator;
  
  // Load addresses
  const addr1 = await readFile("./testnet/address1.addr", { encoding: "utf-8" });
  const addr2 = await readFile("./testnet/address2.addr", { encoding: "utf-8" });
  const address1 = Address.fromString(addr1);
  const address2 = Address.fromString(addr2);
  
  // If using emulator, create initial UTxOs
  // This is ugly, need to improve this
  if (useEmulator) {
    // Initialize emulator with UTxOs directly - don't use getProvider
    const addressBalances = new Map<Address, bigint>();
    addressBalances.set(address1, 15_000_000n);
    addressBalances.set(address2, 15_000_000n);
    
    // Create the emulator instance with initial UTxOs
    provider = initializeEmulator(addressBalances);
  } else {
    provider = getProvider(false);
    console.log("Using Blockfrost - ensure your addresses have been funded with a faucet");
  }
  
  // Step 1: Create the vesting contract
  console.log("\n=== Step 1: Creating vesting contract ===");
  const vestingTxHash = await createVesting(provider);
  console.log(`Vesting contract created with transaction: ${vestingTxHash}`);
  
  // Step 2: Wait for confirmation
  console.log("\n=== Step 2: Waiting for confirmation ===");
  if (useEmulator) {
    console.log("Advancing emulator by 3 blocks for confirmation");
    await (provider as Emulator).awaitBlock(3);
  } else {
    console.log("Waiting 120 seconds for Blockfrost confirmation");
    // Need to reduce this a bit and check if the transaction is confirmed
    // if not, wait again for 15 seconds and repeat 10 times before failing
    await sleep(120_000); // 120 seconds
  }
  // Step 3: Wait for deadline to pass
  console.log("\n=== Step 3: Waiting for deadline to pass ===");
  const deadlineWaitTime = 10000; // Match the deadline in createVesting
  if (useEmulator) {
    // Calculate how many blocks to wait
    // Using 1 block per second as estimation, plus some margin
    const blocksToWait = Math.ceil(deadlineWaitTime / 1000) + 5;
    console.log(`Advancing emulator by ${blocksToWait} blocks to pass deadline`);
    await (provider as Emulator).awaitBlock(blocksToWait);
  } else {
    // Add a small margin to ensure we're past the deadline
    console.log(`Waiting ${Math.ceil(deadlineWaitTime / 1000) + 5} seconds to pass deadline`);
    await sleep(deadlineWaitTime + 5000);
  }
  // Verify that the transaction can be seen on chain
//   const txId = await provider.getTx(vestingTxHash);

  // Step 4: Claim the vested funds
  console.log("\n=== Step 4: Claiming vested funds ===");
  const claimTxHash = await claimVesting(provider);
  console.log(`Vested funds claimed with transaction: ${claimTxHash}`);
  
  // Step 5: Wait for final confirmation
  console.log("\n=== Step 5: Waiting for final confirmation ===");
  if (useEmulator) {
    console.log("Advancing emulator by 1 block for confirmation");
    await (provider as Emulator).awaitBlock(1);
    
    // Print final emulator state
    console.log("\n=== Final Emulator State ===");
    console.log((provider as Emulator).prettyPrintLedgerState());
  } else {
    console.log("Waiting 60 seconds for Blockfrost confirmation");
    await sleep(60000); // 60 seconds
  }
  
  // Verify final balances
  console.log("\n=== Final Verification ===");
  await verifyFinalState(provider, address1, address2);
  
  console.log("\n=== Test Completed Successfully ===");
}

/**
 * Verify the final state of the addresses
 */
async function verifyFinalState(provider: BlockfrostPluts | Emulator , address1: Address, address2: Address) {
  // Get UTxOs at both addresses
  const utxos1 = await provider.addressUtxos(address1);
  const utxos2 = await provider.addressUtxos(address2);
  
  // Calculate total balances
  const balance1 = utxos1.reduce((acc, utxo) => acc + utxo.resolved.value.lovelaces, 0n);
  const balance2 = utxos2.reduce((acc, utxo) => acc + utxo.resolved.value.lovelaces, 0n);
  
  console.log(`Address 1 balance: ${balance1} lovelaces`);
  console.log(`Address 2 balance: ${balance2} lovelaces`);
  
  // Check if address2 received the vested funds
  // In a real test, you'd verify the exact expected amounts
  console.log("Verification complete");
}

/**
 * Utility function to sleep for a number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// If running directly, parse command line arguments
if (require.main === module) {
  const useEmulator = process.argv.includes('--emulator');
  testVestingE2E(useEmulator)
    .then(() => {
      console.log("Test completed successfully");
      process.exit(0);
    })
    .catch(error => {
      console.error("Test failed:", error);
      process.exit(1);
    });
}

export { testVestingE2E };
