import { LogLevelEnum } from "./protobuf";

/**
 * Handles library-wide settings
 */
export class SettingsManager {
  /**
   * debugMode state for the application
   */
  static debugMode: LogLevelEnum;

  constructor() {}

  /**
   * Debug mode enables verbose console output.
   * @param mode Whether the application is in debug mode or not
   */
  static setDebugMode(level: LogLevelEnum) {
    if (!(level in LogLevelEnum)) {
      throw new Error(
        "Error in meshtasticjs.SettingsManager.setDebugMode: param must be a member of DebugLevelEnum"
      );
    }

    SettingsManager.debugMode = level;
  }
}

SettingsManager.debugMode = LogLevelEnum.WARNING;
