import { Protobuf } from "./";
import { SettingsManager } from "./settingsmanager";

/**
 * Converts a `ArrayBuffer` to a hex string
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
 * @param emitter Name of calling function
 * @param message Informative message
 * @param logLevel Desired logging level
 */
const log = (
  emitter: string,
  message: string,
  logLevel: Protobuf.LogLevelEnum
) => {
  if (logLevel >= SettingsManager.debugMode) {
    switch (logLevel) {
      case Protobuf.LogLevelEnum.TRACE:
        console.info(
          `%c[TRACE]%c ${emitter}\n%c${message}`,
          "color:grey",
          "color:darkgrey",
          "color:white"
        );
        break;

      case Protobuf.LogLevelEnum.DEBUG:
        console.info(
          `%c[DEBUG]%c ${emitter}\n%c${message}`,
          "color:lightcyan",
          "color:darkgrey",
          "color:white"
        );
        break;

      case Protobuf.LogLevelEnum.INFO:
        console.info(
          `%c[INFO]%c ${emitter}\n%c${message}`,
          "color:darkgrey",
          "color:white"
        );
        break;
      case Protobuf.LogLevelEnum.WARNING:
        console.warn(
          `%c[WARNING]%c ${emitter}\n%c${message}`,
          "color:yellow",
          "color:darkgrey",
          "color:white"
        );
        break;

      case Protobuf.LogLevelEnum.ERROR:
        console.error(
          `%c[ERROR]%c ${emitter}\n%c${message}`,
          "color:orangered",
          "color:darkgrey",
          "color:white"
        );
        break;

      case Protobuf.LogLevelEnum.CRITICAL:
        console.error(
          `%c[CRITICAL]%c ${emitter}\n%c${message}`,
          "color:red",
          "color:darkgrey",
          "color:white"
        );
        break;
      default:
        break;
    }
  }
};

export { bufferToHex, exponentialBackoff, log, typedArrayToBuffer };
