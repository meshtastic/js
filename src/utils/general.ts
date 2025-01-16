/**
 * Converts a Uint8Array to an ArrayBuffer efficiently, with additional safety checks.
 * @param array - The Uint8Array to convert
 * @returns A new ArrayBuffer containing the Uint8Array data
 * @throws { TypeError } If input is not a Uint8Array
 */
export const typedArrayToBuffer = (array: Uint8Array): ArrayBuffer => {
  if (!(array instanceof Uint8Array)) {
    throw new TypeError("Input must be a Uint8Array");
  }

  if (array.byteLength === 0) {
    return new ArrayBuffer(0);
  }

  // Check if the buffer is shared
  if (array.buffer instanceof SharedArrayBuffer) {
    // Always create a new buffer for shared memory
    const newBuffer = new ArrayBuffer(array.byteLength);
    new Uint8Array(newBuffer).set(array);
    return newBuffer;
  }

  // If array uses the entire buffer and isn't offset, return it directly
  if (array.byteOffset === 0 && array.byteLength === array.buffer.byteLength) {
    return array.buffer;
  }

  // Otherwise, return a slice of the buffer containing just our data
  return array.buffer.slice(
    array.byteOffset,
    array.byteOffset + array.byteLength,
  );
};
