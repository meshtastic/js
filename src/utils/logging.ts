import { LogRecord_Level } from "../generated";
import { SettingsManager } from "../settingsmanager";

/**
 * Global event logger
 * @param emitter Name of calling function
 * @param message Informative message
 * @param logLevel Desired logging level
 */
export const log = (
  emitter: string,
  message: string,
  logLevel: LogRecord_Level
): void => {
  if (logLevel >= SettingsManager.debugMode) {
    switch (logLevel) {
      case LogRecord_Level.TRACE:
        console.info(
          `%c[TRACE]%c ${emitter}\n%c${message}`,
          "color:grey",
          "color:darkgrey",
          "color:white"
        );
        break;

      case LogRecord_Level.DEBUG:
        console.info(
          `%c[DEBUG]%c ${emitter}\n%c${message}`,
          "color:lightcyan",
          "color:darkgrey",
          "color:white"
        );
        break;

      case LogRecord_Level.INFO:
        console.info(
          `%c[INFO]%c ${emitter}\n%c${message}`,
          "color:darkgrey",
          "color:cyan",
          "color:white"
        );
        break;
      case LogRecord_Level.WARNING:
        console.warn(
          `%c[WARNING]%c ${emitter}\n%c${message}`,
          "color:yellow",
          "color:darkgrey",
          "color:white"
        );
        break;

      case LogRecord_Level.ERROR:
        console.error(
          `%c[ERROR]%c ${emitter}\n%c${message}`,
          "color:orangered",
          "color:darkgrey",
          "color:white"
        );
        break;

      case LogRecord_Level.CRITICAL:
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
