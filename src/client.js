import * as constants from "./constants.js"
import { SettingsManager } from "./settingsmanager.js"
import { IBLEConnection } from "./ibleconnection.js"
import { IHTTPConnection } from "./ihttpconnection.js"
import { ProtobufHandler } from "./protobufs/protobufhandler.js"

/** 
 * Allows to create new connections to devices and manages them. 
 * The usage is optional - new connections can be created directly by instantiating 
 * the interface classes.
 */
export class Client {

    /******************
    var deviceInterfaces;  # contains all created connection interfaces
    *******************/

    constructor() {
    
        /** @type {Array} */
        this.deviceInterfaces = new Array;

        // Preload protobufhandler singleton, optional
        new ProtobufHandler();

    }

    /**
     * Creates a new Bluetooth Low Enery connection interface
     * @returns {IBLEConnection}
     */
    createBLEConnection() {

        let iBLEConnection;
        iBLEConnection = new IBLEConnection();
        this.deviceInterfaces.push(iBLEConnection);
        return iBLEConnection;

    }

    /**
     * Creates a new HTTP(S) connection interface
     * @returns {IHTTPConnection}
     */
    createHTTPConnection() {

        let iHTTPConnection;
        iHTTPConnection = new IHTTPConnection();
        this.deviceInterfaces.push(iHTTPConnection);
        return iHTTPConnection;

    }


    createSerialConnection() {

    }

    /**
     * Adds an already created connection interface to the client
     * @param {IBLEConnection} iBLEConnection 
     * @also
     * @param {IHTTPConnection} iHTTPConnection 
     */
    addConnection(connectionObj) {
        this.deviceInterfaces.push(connectionObj);
    }

}

