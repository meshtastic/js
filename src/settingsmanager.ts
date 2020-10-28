/**
 * Handles library-wide settings
 */
export class SettingsManager {
  /**
   * debugMode state for the application
   */
  static debugMode: boolean;

  constructor() {}

  /**
   * Debug mode enables verbose console output.
   * @param active Whether the application is in debug mode or not
   */
  setDebugMode(active: boolean) {
    if (typeof active !== "boolean") {
      throw "Error in meshtasticjs.SettingsManager.setDebugMode: param must be boolean";
    }

    SettingsManager.debugMode = active;
  }
}

SettingsManager.debugMode = false;
