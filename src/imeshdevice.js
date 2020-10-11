import * as constants from "./constants.js"
import { SettingsManager } from "./settingsmanager.js"
import { NodeDB } from "./nodedb.js"
import { ProtobufHandler } from "./protobufs/protobufhandler.js";

export class IMeshDevice extends EventTarget {

    /******************
    # Available event listeners:
    // fromRadio        # Gets called whenever a fromRadio message is received from device, returns fromRadio data
    // dataPacket       # Gets called when a data packet is received from device
    // userPacket       # Gets called when a user packet is received from device
    // positionPacket   # Gets called when a position packet is received from device
    // nodeListChanged  # Gets called when node database has been changed, returns changed node number.
    // connected        # Gets called when link to device is connected
    // disconnected     # Gets called when link to device is disconnected
    // configDone       # Gets called when device has been configured (myInfo, radio and node data received). device interface is now ready to be used

    # Child classes must implement:
    connect()
    disconnect()
    _readFromRadio()
    _writeToRadio()

    # State variables
    bool isConnected;
    bool isReconnecting;
    bool isConfigDone;
    bool isConfigStarted;
    
    # Data object variables
    var nodes;
    var radioConfig;
    var currentPacketId;
    var user;
    var myInfo;

    var protobufHandler;
    *******************/

    constructor() {

        super();

        this.isConnected = false;
        this.isReconnecting = false;
        this.isConfigDone = false;
        this.isConfigStarted = false;

        this.protobufHandler = new ProtobufHandler();

        this.nodes = new NodeDB();
        this.nodes.addEventListener('nodeListChanged', this._onNodeListChanged.bind(this));

        this.radioConfig = undefined;
        this.currentPacketId = undefined;
        this.user = undefined;
        this.myInfo = undefined;

    }



    async sendText(text, destinationId=constants.BROADCAST_ADDR, wantAck=false, wantResponse=false) {

        let dataType = this.protobufHandler.getType("Data.Type");
        dataType = dataType.values["CLEAR_TEXT"];

        // DOMStrings are 16-bit-encoded strings, convert to UInt8Array first
        let enc = new TextEncoder();
        text = enc.encode(text);

        return await this.sendData(text, destinationId, dataType, wantAck, wantResponse);

    }


    async sendData(byteData, destinationId=constants.BROADCAST_ADDR, dataType, wantAck=false, wantResponse=false) {

        if (dataType === undefined) {
            dataType = this.protobufHandler.getType("Data.Type");
            dataType = dataType.values["OPAQUE"];

        }

        var data = {};

        data.payload = byteData;
        data.typ = dataType;

        var subPacket = { 
            data: data,
            wantResponse: wantResponse
        };
        
        var meshPacket = { decoded: subPacket };

        return await this.sendPacket(meshPacket, destinationId, wantAck);

    }


    async sendPosition(latitude=0.0, longitude=0.0, altitude=0, timeSec=0, destinationId=constants.BROADCAST_ADDR, wantAck=false, wantResponse=false) {

        var position = {};
        
        if(latitude != 0.0) {
            position.latitudeI = Math.floor(latitude / 1e-7);
        }

        if(longitude != 0.0) {
            position.longitudeI = Math.floor(longitude / 1e-7);
        }

        if(altitude != 0) {
            position.altitude = Math.floor(altitude);
        }

        if (timeSec == 0) {
            timeSec = Math.floor(Date.now() / 1000);
        }
        position.time = timeSec;

        var subPacket = { 
            position: position,
            wantResponse: wantResponse
        };
        
        var meshPacket = { decoded: subPacket };

        return await this.sendPacket(meshPacket, destinationId, wantAck);
    }


    async sendPacket(meshPacket, destinationId=constants.BROADCAST_ADDR, wantAck=false) {

        if (this.isDeviceReady() === false) {
            throw new Error('Error in meshtasticjs.MeshInterface.sendPacket: Device is not ready');
        }

        var rcptNodeNum;

        if (typeof destinationId == 'number') {
            rcptNodeNum = destinationId;
        } else if (destinationId == constants.BROADCAST_ADDR) {
            rcptNodeNum = constants.BROADCAST_NUM;
        } else {
            throw new Error('Error in meshtasticjs.MeshInterface.sendPacket: Invalid destinationId');
        }

        meshPacket.to = rcptNodeNum;
        meshPacket.wantAck = wantAck;

        if (meshPacket.id === undefined || !meshPacket.hasOwnProperty('id')) {
            meshPacket.id = this._generatePacketId();
        }

        let packet = { packet: meshPacket };
    
        let toRadio = this.protobufHandler.toProtobuf('ToRadio', packet);
        await this._writeToRadio(toRadio.uint8array);
        return toRadio.obj;
    }


    async setRadioConfig(configOptionsObj) {

        if (this.radioConfig === undefined || this.isDeviceReady() === false) {
            throw new Error('Error: meshtasticjs.IMeshDevice.setRadioConfig: Radio config has not been read from device, can\'t set new one. Try reconnecting.');
        }

        if (!configOptionsObj.hasOwnProperty('channelSettings') && !configOptionsObj.hasOwnProperty('preferences')) {
            throw new Error('Error: meshtasticjs.IMeshDevice.setRadioConfig: Invalid config options object provided');
        }


        if (configOptionsObj.hasOwnProperty('channelSettings')) {
            Object.assign(this.radioConfig.channelSettings, configOptionsObj.channelSettings);
        }
        if (configOptionsObj.hasOwnProperty('preferences')) {
            Object.assign(this.radioConfig.preferences, configOptionsObj.preferences);
        }

        let setRadio = { setRadio: this.radioConfig };

        let toRadio = this.protobufHandler.toProtobuf('ToRadio', setRadio);
        await this._writeToRadio(toRadio.uint8array);
        return toRadio.obj;
    }


    async setOwner(ownerDataObj) {

        if (this.user === undefined || this.isDeviceReady() === false) {
            throw new Error('Error: meshtasticjs.IMeshDevice.setOwner: Owner config has not been read from device, can\'t set new one. Try reconnecting.');
        }
        
        if (typeof ownerDataObj !== 'object') {
            throw new Error('Error: meshtasticjs.IMeshDevice.setRadioConfig: Invalid config options object provided');
        }

        Object.assign(this.user, ownerDataObj);
        
        let setOwner = { setOwner: this.user };
        
        let toRadio = this.protobufHandler.toProtobuf('ToRadio', setOwner);
        await this._writeToRadio(toRadio.uint8array);
        return toRadio.obj;
    }


    async configure() {

        if (this.isConnected === false) {
            throw new Error('Error in meshtasticjs.MeshInterface.configure: Interface is not connected');
        }

        this.isConfigStarted = true;

        let wantConfig = {};
        wantConfig.wantConfigId = constants.MY_CONFIG_ID;
        let toRadio = this.protobufHandler.toProtobuf('ToRadio', wantConfig);

        await this._writeToRadio(toRadio.uint8array);

        await this._readFromRadio();

        if (this.isConfigDone === false) {
            throw new Error('Error in meshtasticjs.MeshInterface.configure: configuring device was not successful');
        }

        return 0;

    }

    // Returns true if device interface is fully configured and can be used
    isDeviceReady() {
        if (this.isConnected === true && this.isConfigDone === true) {
            return true;
        } else {
            return false;
        }
    }




    _generatePacketId() {
        if (this.currentPacketId === undefined) {
            throw "Error in meshtasticjs.MeshInterface.generatePacketId: Interface is not configured, can't generate packet id";
        } else {
            this.currentPacketId = this.currentPacketId + 1;
            return this.currentPacketId;
        }
    }


    async _handleFromRadio(fromRadioUInt8Array) {


        var fromRadioObj;


        if (fromRadioUInt8Array.byteLength < 1) {
            if (SettingsManager.debugMode) { console.log("Empty buffer received"); } 
            return 0;
        }


        try {
            fromRadioObj =  this.protobufHandler.fromProtobuf('FromRadio', fromRadioUInt8Array); 
        } catch (e) {
            throw new Error('Error in meshtasticjs.IMeshDevice.handleFromRadio: ' + e.message);
        }

        
        if (SettingsManager.debugMode) { console.log(fromRadioObj); };


        if (this.isConfigDone === true) {

            this._dispatchInterfaceEvent('fromRadio', fromRadioObj);

        }


        if (fromRadioObj.hasOwnProperty('myInfo')) {

            this.myInfo = fromRadioObj.myInfo;
            this.currentPacketId = fromRadioObj.myInfo.currentPacketId;


        } else if (fromRadioObj.hasOwnProperty('radio')) {

            this.radioConfig = fromRadioObj.radio;


        } else if (fromRadioObj.hasOwnProperty('nodeInfo')) {           

            this.nodes.addNode(fromRadioObj.nodeInfo);

            if (fromRadioObj.nodeInfo.num === this.myInfo.myNodeNum) {
                this.user = fromRadioObj.nodeInfo.user;
            }


        } else if (fromRadioObj.hasOwnProperty('configCompleteId')) {

            if(fromRadioObj.configCompleteId === constants.MY_CONFIG_ID) {
                this._onConfigured();
            }

        } else if (fromRadioObj.hasOwnProperty('packet')) {

            this._handleMeshPacket(fromRadioObj.packet);

        } else if (fromRadioObj.hasOwnProperty('rebooted')) {

            await this.configure();

        } else {
            // Don't throw error here, continue and just log to console
            if (SettingsManager.debugMode) { console.log('Error in meshtasticjs.MeshInterface.handleFromRadio: Invalid data received'); }

        }

        return fromRadioObj;
    }

    _handleMeshPacket(meshPacket) {

        var eventName;

        if (meshPacket.decoded.hasOwnProperty('data')) {

            if (!meshPacket.decoded.data.hasOwnProperty('typ')) {
                meshPacket.decoded.data.typ = "OPAQUE";
            }

            eventName = 'dataPacket';

        } else if (meshPacket.decoded.hasOwnProperty('user')) {

            this.nodes.addUserData(meshPacket.from, meshPacket.decoded.user);
            eventName = 'userPacket';

        } else if (meshPacket.decoded.hasOwnProperty('position')) {

            this.nodes.addPositionData(meshPacket.from, meshPacket.decoded.position);
            eventName = 'positionPacket';

        }

        this._dispatchInterfaceEvent(eventName, meshPacket);

    }

    // Gets called when a link to the device has been established
    async _onConnected(noAutoConfig) {

        this.isConnected = true;
        this.isReconnecting = false;
        this._dispatchInterfaceEvent('connected', this);


        if (noAutoConfig !== true) {
            try {
                await this.configure();
                return;
            }
            catch (e) {
                throw new Error('Error in meshtasticjs.IMeshDevice.onConnected: ' + e.message);
            }
 
        }
    }

    // Gets called when a link to the device has been disconnected
    _onDisconnected() {
        this._dispatchInterfaceEvent('disconnected', this);
        this.isConnected = false;
    }

    // Gets called when the device has been configured (myInfo, radio and node data received). device interface is now ready to be used
    _onConfigured() {
        this.isConfigDone = true;
        this._dispatchInterfaceEvent('configDone', this);
        if (SettingsManager.debugMode) { console.log('Configured device with node number ' + this.myInfo.myNodeNum); }
    }


    _onNodeListChanged() {
        if (this.isConfigDone === true) {
            this._dispatchInterfaceEvent('nodeListChanged', this);

        }
    }


    _dispatchInterfaceEvent(eventType, payload) {
        this.dispatchEvent(
            new CustomEvent(eventType, { detail: payload })
        );
    }


}