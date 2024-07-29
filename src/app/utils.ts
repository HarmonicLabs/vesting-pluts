
export const hexToUint8Array = (hexString: any) => {
    if (hexString.length % 2 !== 0) {
      throw new Error("Hex string must have an even length");
    }
    const array = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
      array[i / 2] = parseInt(hexString.substr(i, 2), 16);
    }
    return array;
}
