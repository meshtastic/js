import * as constants from "./constants.js"
import { IBLEConnection } from "./ibleconnection.js"
import { Root as protobufjs } from "../node_modules/protobufjs/index.js"

export class Client {

    /******************
    var deviceInterfaces;  # contains all created connection interfaces
    var protobufjs         # protobufjs reference
    var debugMode;         # prints verbose things in console
    *******************/

    constructor() {

        // optional: make this a singleton class, if static client already exists, return existing class
        //if (Client.instance !== undefined) {
        //    return Client.instance;
        //} 
        //Client.instance = this;

        this.deviceInterfaces = new Array;
        this.debugMode = false;

    }


    init(debugMode=false) {

        if (typeof debugMode === 'boolean') {
            this.debugMode = debugMode;
        }

        let protobufJSONData = require('../proto/meshproto.json');

        try {
            this.protobufjs = protobufjs.fromJSON(protobufJSONData);
        }
        catch (e) {
            throw new Error('Error in meshtasticjs.Client.init: ' + e.message);
        }

        if (this.debugMode) { console.log('protobufjs loaded and initialized'); console.log(this.protobufjs); }

        return 0;

    }

  
    createBLEConnection() {

        let iBLEConnection;
        iBLEConnection = new IBLEConnection(this);
        this.deviceInterfaces.push(iBLEConnection);
        return iBLEConnection;

    }


    createSerialConnection() {

    }


    getConnByMac(macAddr) {
        // ToDo: Get connection by mac address
    }


    getConnByName(deviceName) {
        // ToDo: Get connection by device name?
    }

}

