import { LogRecord_Level } from "./generated/mesh";
import { log } from "./utils/logging";

/**
 * Handles library-wide settings
 */
export class SettingsManager {
  /**
   * Logging level for the application
   * @todo setting value to LogRecord_Level.WARNING errors `undefined`
   */
  static debugMode: LogRecord_Level = LogRecord_Level.WARNING;

  /**
   * Sets the library-wide logging level
   * @param level Desired level of logging
   */
  static setDebugMode(level: LogRecord_Level): void {
    if (!(level in LogRecord_Level)) {
      log(
        `SettingsManager.setDebugMode`,
        `Specified log level must be a member of LogRecord_Level.`,
        LogRecord_Level.WARNING
      );
    }

    SettingsManager.debugMode = level;
  }
}
