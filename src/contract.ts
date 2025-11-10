import fs from 'fs';
import { Compiler, createMemoryCompilerIoApi } from '@harmoniclabs/pebble';
import { Script, ScriptType, Address, Credential } from "@harmoniclabs/buildooor";
import { fromUtf8 } from "@harmoniclabs/uint8array-utils";

const CONTRACT_NAME = 'index.pebble';

const CONTRACT = fs.readFileSync(CONTRACT_NAME, 'utf8');

async function compileContract(): Promise<Uint8Array> {
  const ioApi = createMemoryCompilerIoApi({
    sources: new Map([
      [CONTRACT_NAME, fromUtf8(CONTRACT)],
    ]),
    useConsoleAsOutput: true,
  });

  const compiler = new Compiler(ioApi);

  await compiler.compile({ entry: CONTRACT_NAME, root: "/", outDir: 'dist' });

  const compiled = ioApi.outputs.get("dist/out.flat");

  return compiled || new Uint8Array();
}

const bytes = await compileContract();

export const script = new Script(ScriptType.PlutusV3, bytes);

export const scriptMainnetAddr = new Address(
  "mainnet",
  Credential.script( script.hash )
);

export const scriptTestnetAddr = new Address(
  "testnet",
  Credential.script( script.hash )
);

// function getScript(bytes: Uint8Array): Script {
//   return new Script(ScriptType.PlutusV3, bytes);
// }

// function getScriptMainnetAddr(script: Script): Address {
//   return new Address(
//       "mainnet",
//       Credential.script( script.hash )
//   );
// }

// function getScriptTestnetAddr(script: Script): Address {
//   return new Address(
//       "testnet",
//       Credential.script( script.hash )
//   );
// }

export interface CompiledContract {
  script: Script;
  testnetAddress: Address;
}

// export async function loadContract(): Promise<CompiledContract> {
//   const bytes = await compileContract();
//   const script = getScript(bytes);
//   const testnetAddress = getScriptTestnetAddr(script);
//   return { script, testnetAddress };
// }