/**
 * Converts a `ArrayBuffer` to a hex string
 * @todo verify `x` data type
 * @param arrayBuffer Input `ArrayBuffer` to be converted
 */
export function bufferToHex(arrayBuffer: ArrayBuffer) {
  return Array.prototype.map
    .call(new Uint8Array(arrayBuffer), (x: number) =>
      ("00" + x.toString(16)).slice(-2)
    )
    .join("") as string;
}

/**
 * Converts a `Uint8Array` to an `ArrayBuffer`
 * @param array Input `Uint8Array` to be converted
 */
export function typedArrayToBuffer(array: Uint8Array) {
  return array.buffer.slice(
    array.byteOffset,
    array.byteLength + array.byteOffset
  );
}

/**
 * Short description
 */
export function getEnvironment() {
  if (typeof window !== "undefined") {
    return "browser";
  }
  return "nobrowser";
}

/**
 * This function keeps calling `toTry` until promise resolves or fails
 *  https://googlechrome.github.io/samples/web-bluetooth/automatic-reconnect-async-await.html
 *
 * @param max Maximum number of times `toTry` can be called
 * @param delay Delay (seconds) of the first retry
 * @param toTry Called rerty function
 * @param success Function called upon success if `toTry`
 * @param fail Function called upon timeout
 */
export async function exponentialBackoff(
  max: number,
  delay: number,
  toTry: Function,
  success: Function,
  fail: Function
) {
  try {
    const result = await toTry();
    success(result);
  } catch (error) {
    if (max === 0) {
      return fail();
    }
    setTimeout(function () {
      exponentialBackoff(--max, delay * 2, toTry, success, fail);
    }, delay * 1000);
  }
}
