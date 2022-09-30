import { Protobuf, Types } from "./index.js";
import { log } from "./utils/logging.js";

/** Handles library-wide settings */
export class SettingsManager {
  /** Logging level for the application */
  static debugMode: Protobuf.LogRecord_Level = Protobuf.LogRecord_Level.WARNING;

  /**
   * Sets the library-wide logging level
   *
   * @param {Protobuf.LogRecord_Level} level Desired level of logging
   */
  static setDebugMode(level: Protobuf.LogRecord_Level): void {
    if (!(level in Protobuf.LogRecord_Level)) {
      log(
        Types.EmitterScope.SettingsManager,
        Types.Emitter.setDebugMode,
        `Specified log level must be a member of LogRecord_Level.`,
        Protobuf.LogRecord_Level.WARNING
      );
    }

    SettingsManager.debugMode = level;
  }
}
