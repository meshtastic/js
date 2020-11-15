import { DebugLevelEnum, SettingsManager } from "./settingsmanager";

/**
 * Converts a `ArrayBuffer` to a hex string
 * @todo verify `x` data type
 * @param arrayBuffer Input `ArrayBuffer` to be converted
 */
const bufferToHex = (arrayBuffer: ArrayBuffer) => {
  return Array.prototype.map
    .call(new Uint8Array(arrayBuffer), (x: number) =>
      `00${x.toString(16)}`.slice(-2)
    )
    .join("") as string;
};

/**
 * Converts a `Uint8Array` to an `ArrayBuffer`
 * @param array Input `Uint8Array` to be converted
 */
const typedArrayToBuffer = (array: Uint8Array) => {
  return array.buffer.slice(
    array.byteOffset,
    array.byteLength + array.byteOffset
  );
};

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
const exponentialBackoff = async (
  max: number,
  delay: number,
  toTry: Function,
  success: Function,
  fail: Function
) => {
  try {
    success(await toTry());
  } catch (error) {
    if (max === 0) {
      return fail();
    }
    setTimeout(() => {
      exponentialBackoff(--max, delay * 2, toTry, success, fail);
    }, delay * 1000);
  }
};

/**
 * Global event logger
 * @param data data to be logged
 * @param logLevel loglevel to associate data with
 */
const debugLog = (data: any, logLevel: DebugLevelEnum) => {
  if (logLevel >= SettingsManager.debugMode) {
    switch (logLevel) {
      case DebugLevelEnum.INFO:
        console.info(data);
        break;
      case DebugLevelEnum.DEBUG:
        console.debug(data);
        break;
      case DebugLevelEnum.WARN:
        console.warn(data);
        break;
      case DebugLevelEnum.ERROR:
        console.error(data);
        break;
      default:
        break;
    }
  }
};

export { bufferToHex, typedArrayToBuffer, exponentialBackoff, debugLog };
