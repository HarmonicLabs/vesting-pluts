import { Address, bool, compile, data, makeValidator, PaymentCredentials, pBool, pfn, pmatch, PScriptContext, Script, ScriptType } from "@harmoniclabs/plu-ts";
import VestingDatum from "./VestingDatum";

export const contract = pfn([
    VestingDatum.type,
    data,
    PScriptContext.type
],  bool)
(( datum, redeemer, ctx ) => {
     // inlined
    const signedByBeneficiary = ctx.tx.signatories.some( datum.beneficiary.eq )

    // inlined
    const deadlineReached = 
        pmatch( ctx.tx.interval.from.bound )
        .onPFinite(({ _0: lowerInterval }) =>
            datum.deadline.ltEq( lowerInterval ) 
        )
        ._( _ => pBool( false ) )

    return signedByBeneficiary.and( deadlineReached );
});

///////////////////////////////////////////////////////////////////
// ------------------------------------------------------------- //
// ------------------------- utilities ------------------------- //
// ------------------------------------------------------------- //
///////////////////////////////////////////////////////////////////

export const untypedValidator = makeValidator( contract );

export const compiledContract = compile( untypedValidator );

export const script = new Script(
    ScriptType.PlutusV2,
    compiledContract
);

export const scriptMainnetAddr = new Address(
    "mainnet",
    PaymentCredentials.script( script.hash )
);

export const scriptTestnetAddr = new Address(
    "testnet",
    PaymentCredentials.script( script.hash )
);

export default contract;