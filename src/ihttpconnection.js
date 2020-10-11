import * as constants from "./constants.js"
import { SettingsManager } from "./settingsmanager.js"
import { IMeshDevice } from "./imeshdevice";

export class IHTTPConnection extends IMeshDevice {

    /******************
    bool userInitiatedDisconnect;
    *******************/

    /*must implement:
    connect()
    disconnect()
    _readFromRadio()
    _writeToRadio()*/

    constructor() {
        super();
    }

    async connect(address, noAutoConfig=false) {

    }

    async disconnect() {

    }

    async _readFromRadio() {

        // call _handleFromRadio with uint8array here

    }

    async _writeToRadio(ToRadioUInt8Array) {

    }
    
}