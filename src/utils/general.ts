/**
 * Converts a `Uint8Array` to an `ArrayBuffer`
 */
export const typedArrayToBuffer = (array: Uint8Array): ArrayBuffer => {
  return array.buffer.slice(
    array.byteOffset,
    array.byteLength + array.byteOffset,
  );
};
