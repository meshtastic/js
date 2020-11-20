/**
 * Desired logging output level
 */
export enum DebugLevelEnum {
  /**
   * All events will be logged (verbose)
   */
  INFO,
  /**
   * All debug and higher events will be logged
   */
  DEBUG,
  /**
   * Log only non critial waning events and higher
   */
  WARN,
  /**
   * Log only the highest level error messages
   */
  ERROR,
  /**
   * Disables logging of all events
   */
  NONE,
}

/**
 * Handles library-wide settings
 */
export class SettingsManager {
  /**
   * debugMode state for the application
   */
  static debugMode: DebugLevelEnum;

  constructor() {}

  /**
   * Debug mode enables verbose console output.
   * @param mode Whether the application is in debug mode or not
   */
  static setDebugMode(level: DebugLevelEnum) {
    if (!(level in DebugLevelEnum)) {
      throw new Error(
        "Error in meshtasticjs.SettingsManager.setDebugMode: param must be a member of DebugLevelEnum"
      );
    }

    SettingsManager.debugMode = level;
  }
}

SettingsManager.debugMode = DebugLevelEnum.NONE;
