import { Protobuf } from "./";
import { LogLevelEnum } from "./protobufs";
import { log } from "./utils";

/**
 * Handles library-wide settings
 */
export class SettingsManager {
  /**
   * Logging level for the application
   * @todo setting value to Protobuf.LogLevelEnum.WARNING errors `undefined`
   */
  static debugMode: Protobuf.LogLevelEnum = LogLevelEnum.WARNING;

  constructor() {}

  /**
   * Sets the library-wide logging level
   * @param level Desired level of logging
   */
  static setDebugMode(level: Protobuf.LogLevelEnum) {
    if (!(level in Protobuf.LogLevelEnum)) {
      log(
        `SettingsManager.setDebugMode`,
        `Specified log level must be a member of LogLevelEnum.`,
        Protobuf.LogLevelEnum.WARNING
      );
    }

    SettingsManager.debugMode = level;
  }
}
