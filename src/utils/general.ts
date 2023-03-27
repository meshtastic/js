/**
 * Converts a `ArrayBuffer` to a hex string
 */
export const bufferToHex = (arrayBuffer: ArrayBuffer): string =>
  [...new Uint8Array(arrayBuffer)]
    .map((x) => `00${x.toString(16).slice(-2)}`)
    .join("");

/**
 * Converts a `Uint8Array` to an `ArrayBuffer`
 */
export const typedArrayToBuffer = (array: Uint8Array): ArrayBuffer => {
  return array.buffer.slice(
    array.byteOffset,
    array.byteLength + array.byteOffset,
  );
};
