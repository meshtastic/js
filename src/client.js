import * as constants from "./constants.js"
import { SettingsManager } from "./settingsmanager.js"
import { IBLEConnection } from "./ibleconnection.js"
import { IHTTPConnection } from "./ihttpconnection.js"
import { ProtobufHandler } from "./protobufs/protobufhandler.js"

export class Client {

    /******************
    var deviceInterfaces;  # contains all created connection interfaces
    *******************/

    constructor() {

        this.deviceInterfaces = new Array;

        // Preload protobufhandler singleton, optional
        new ProtobufHandler();

    }

  
    createBLEConnection() {

        let iBLEConnection;
        iBLEConnection = new IBLEConnection();
        this.deviceInterfaces.push(iBLEConnection);
        return iBLEConnection;

    }

    createHTTPConnection() {

        let iHTTPConnection;
        iHTTPConnection = new IHTTPConnection();
        this.deviceInterfaces.push(iHTTPConnection);
        return iHTTPConnection;

    }


    createSerialConnection() {

    }


    addConnection(connectionObj) {
        this.deviceInterfaces.push(connectionObj);
    }

}

