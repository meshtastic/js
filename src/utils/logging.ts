import { Protobuf, Types } from "../index.js";

/**
 * Global event logger
 *
 * @param {Types.EmitterScope} scope Debug statement's wrapper class
 * @param {Types.Emitter} emitter Name of calling function
 * @param {string} message Informative message
 * @param {Protobuf.LogRecord_Level} level Desired logging level
 * @param {Protobuf.LogRecord_Level} currentLevel Current logging level
 */
export const log = (
  scope: Types.EmitterScope,
  emitter: Types.Emitter,
  message: string,
  level: Protobuf.LogRecord_Level,
  currentLevel: Protobuf.LogRecord_Level
): void => {
  if (level >= currentLevel) {
    switch (level) {
      case Protobuf.LogRecord_Level.TRACE:
        console.info(
          `%c[TRACE]%c ${Types.EmitterScope[scope] ?? "UNK"}.${
            Types.Emitter[emitter] ?? "UNK"
          }\n%c${message}`,
          "color:grey",
          "color:darkgrey",
          "color:white"
        );
        break;

      case Protobuf.LogRecord_Level.DEBUG:
        console.info(
          `%c[DEBUG]%c ${Types.EmitterScope[scope] ?? "UNK"}.${
            Types.Emitter[emitter] ?? "UNK"
          }\n%c${message}`,
          "color:lightcyan",
          "color:darkgrey",
          "color:white"
        );
        break;

      case Protobuf.LogRecord_Level.INFO:
        console.info(
          `%c[INFO]%c ${Types.EmitterScope[scope] ?? "UNK"}.${
            Types.Emitter[emitter] ?? "UNK"
          }\n%c${message}`,
          "color:darkgrey",
          "color:cyan",
          "color:white"
        );
        break;
      case Protobuf.LogRecord_Level.WARNING:
        console.warn(
          `%c[WARNING]%c ${Types.EmitterScope[scope] ?? "UNK"}.${
            Types.Emitter[emitter] ?? "UNK"
          }\n%c${message}`,
          "color:yellow",
          "color:darkgrey",
          "color:white"
        );
        break;

      case Protobuf.LogRecord_Level.ERROR:
        console.error(
          `%c[ERROR]%c ${Types.EmitterScope[scope] ?? "UNK"}.${
            Types.Emitter[emitter] ?? "UNK"
          }\n%c${message}`,
          "color:orangered",
          "color:darkgrey",
          "color:white"
        );
        break;

      case Protobuf.LogRecord_Level.CRITICAL:
        console.error(
          `%c[CRITICAL]%c ${Types.EmitterScope[scope] ?? "UNK"}.${
            Types.Emitter[emitter] ?? "UNK"
          }\n%c${message}`,
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
