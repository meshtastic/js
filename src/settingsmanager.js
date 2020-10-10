export class SettingsManager {

    /******************
    # provides library-wide settings

    static var debugMode
    *******************/

    constructor() {}

    static setDebugMode(isActive) {

        if (typeof isActive !== "boolean") {
            throw 'Error in meshtasticjs.SettingsManager.setDebugMode: param must be boolean';
        }

        SettingsManager.debugMode = isActive;

    }


}

SettingsManager.debugMode = false;