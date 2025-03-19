## Integrate pluts-emulator into Vesting example

The integration is implemented in a single `.ts` file which handles both `create` and `claim`.

This primarily means emulator replaces the Blockfrost API by simulating the blockchain environment.

### Run

To run the vesting example, go through the below sequence:

1. `npm run build`
2. `npm run vesting:start`
3. `npm run vesting:genKeys`
4. `npm run vesting:emulator`
    - Initializes emulator populating UTXOs for generated addresses
    - Invokes _create_ of _vesting contract_   
        Build Tx, sign and submit the Tx; then invoke `awaitBlock(1)` to dequeue the Tx from Mempool to next Block.
    - `await awaitBlock(5)` to assume few blocks have passed so that claim transaction is valid, as it is dependent on the deadline condition being met.
    - Invokes _claim_ of _contract_ after a timeout 
        Build, sign and submit the Tx; then invoke `awaitBlock(1)` to dequeue the Tx from Mempool to next Block.
    

