import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { script } from "./contract";

console.log("validator compiled succesfully! 🎉\n");
console.log(
    JSON.stringify(
        script.toJson(),
        undefined,
        2
    )
);

async function main() 
{
    if( !existsSync("./testnet") )
    {
        await mkdir("./testnet");
    }
    await writeFile("./testnet/vesting.plutus.json", JSON.stringify(script.toJson(), undefined, 4))
}
main();