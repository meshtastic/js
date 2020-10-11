/**
 * Handles library-wide settings
 * @property {boolean} debugMode
 */
export class SettingsManager {

    /******************
    # provides library-wide settings

    static var debugMode
    *******************/

    constructor() {}

    /**
     * Debug mode enables verbose console output.
     * @param {boolean} active 
     */
    static setDebugMode(active) {

        if (typeof active !== "boolean") {
            throw 'Error in meshtasticjs.SettingsManager.setDebugMode: param must be boolean';
        }

        SettingsManager.debugMode = active;

    }


}

SettingsManager.debugMode = false;