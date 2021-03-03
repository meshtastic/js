import { LogLevelEnum } from "./protobufs";
import { log } from "./utils";

/**
 * Handles library-wide settings
 */
export class SettingsManager {
  /**
   * Logging level for the application
   */
  static debugMode: LogLevelEnum;

  constructor() {}

  /**
   * Sets the library-wide logging level
   * @param level Desired level of logging
   */
  static setDebugMode(level: LogLevelEnum) {
    if (!(level in LogLevelEnum)) {
      log(
        `SettingsManager.setDebugMode`,
        `Specified log level must be a member of LogLevelEnum.`,
        LogLevelEnum.WARNING
      );
    }

    SettingsManager.debugMode = level;
  }
}

SettingsManager.debugMode = LogLevelEnum.WARNING;
