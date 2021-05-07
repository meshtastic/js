/**
 * Converts a `ArrayBuffer` to a hex string
 * @param arrayBuffer Input `ArrayBuffer` to be converted
 */
export const bufferToHex = (arrayBuffer: ArrayBuffer): string => {
  return Array.prototype.map
    .call(new Uint8Array(arrayBuffer), (x: number) =>
      `00${x.toString(16)}`.slice(-2)
    )
    .join("");
};

/**
 * Converts a `Uint8Array` to an `ArrayBuffer`
 * @param array Input `Uint8Array` to be converted
 */
export const typedArrayToBuffer = (array: Uint8Array): ArrayBuffer => {
  return array.buffer.slice(
    array.byteOffset,
    array.byteLength + array.byteOffset
  );
};
