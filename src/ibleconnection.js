import * as constants from "./constants.js"
import { SettingsManager } from "./settingsmanager.js"
import { IMeshDevice } from "./imeshdevice.js"
import { exponentialBackoff, typedArrayToBuffer } from "./utils.js"

/**
 * Allows to connect to a meshtastic device via bluetooth
 * @extends IMeshDevice
 */
export class IBLEConnection extends IMeshDevice {

    /******************
    # BLE API references
    var device;
    var connection;
    var service;

    # BLE API characteristics references
    var toRadioCharacteristic;
    var fromRadioCharacteristic;
    var fromNumCharacteristic;

    bool userInitiatedDisconnect;
    *******************/

    constructor() {

        super();

        /** @type {BluetoothDevice} */
        this.device = undefined;
        /** @type {BluetoothRemoteGATTServer} */
        this.connection = undefined;
        /** @type {BluetoothRemoteGATTService} */
        this.service = undefined;

        /** @type {BluetoothRemoteGATTCharacteristic} */
        this.toRadioCharacteristic = undefined;
        /** @type {BluetoothRemoteGATTCharacteristic} */
        this.fromRadioCharacteristic = undefined;
        /** @type {BluetoothRemoteGATTCharacteristic} */
        this.fromNumCharacteristic = undefined;

        /** @type {boolean} */
        this.userInitiatedDisconnect = false;

    }

    /**
     * Initiates the connect process to a meshtastic device via bluetooth
     * @param {boolean} [requestDeviceFilterParams=false] optional filter options for the web bluetooth api requestDevice() method
     * @param {boolean} [noAutoConfig=false] connect to the device without configuring it. Requires to call configure() manually
     * @returns {number} 0 on success
     */
    async connect(requestDeviceFilterParams=false, noAutoConfig=false) {

        if (this.isConnected === true) {
            throw new Error('Error in meshtasticjs.IBLEConnection.connect: Device is already connected');

        } else if (navigator.bluetooth === undefined) {
            throw new Error('Error in meshtasticjs.IBLEConnection.connect: this browser doesn\'t support the bluetooth web api, see https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API');
        }


        let device, connection, service;

        try {

            // If no device has been selected, open request device browser prompt
            if (this.device === undefined) {
                device = await this._requestDevice(requestDeviceFilterParams);
                this.device = device;
            }
        
            if (this.isReconnecting === false) {
                this._subscribeToBLEConnectionEvents();
            }

            connection = await this._connectToDevice(this.device);
            this.connection = connection;

            service = await this._getService(this.connection);
            this.service = service;

            await this._getCharacteristics(this.service);

            await this._subscribeToBLENotification();

            // At this point device is connected
            this.isConnected = true;
        
            await this._onConnected(noAutoConfig);

            return 0;

        }
        catch (e) {
            throw new Error('Error in meshtasticjs.IBLEConnection.connect: ' + e.message);
        }

    }

    /**
     * Disconnects from the meshtastic device
     * @returns {number} 0 on success, 1 if device is already disconnected
     */
    async disconnect() {

        this.userInitiatedDisconnect = true; // Don't reconnect

        if (this.isConnected === false && this.isReconnecting === false) {
            if (SettingsManager.debugMode) { console.log('meshtasticjs.IBLEConnection.disconnect: device already disconnected'); }
            return 1;
        } else if (this.isConnected === false && this.isReconnecting === true) {
            if (SettingsManager.debugMode) { console.log('meshtasticjs.IBLEConnection.disconnect: reconnect cancelled'); }
        }
        
        await this.connection.disconnect();
        // No need to call parent _onDisconnected here, calling disconnect() triggers gatt event

        return 0;
    }




    async _readFromRadio() {

        var readBuffer = new ArrayBuffer(1);
        
        // read as long as the previous read buffer is bigger 0
        while (readBuffer.byteLength > 0) {

            try {
                readBuffer = await this._readFromCharacteristic(this.fromRadioCharacteristic);
                
                if (readBuffer.byteLength > 0) {
                    await this._handleFromRadio(new Uint8Array(readBuffer, 0));
                }
                
            } catch (e) {
                throw new Error("Error in meshtasticjs.IBLEConnection.readFromRadio: " + e.message);
            }


        }

    }


    async _writeToRadio(ToRadioUInt8Array) {

        let ToRadioBuffer = typedArrayToBuffer(ToRadioUInt8Array);

        await this.toRadioCharacteristic.writeValue(ToRadioBuffer);

    }


    async _readFromCharacteristic(characteristic) {
        
        try {
            let readBuffer = await characteristic.readValue();
            readBuffer = readBuffer.buffer;
            return readBuffer;

        }
        catch (e) {
            throw new Error("Error in meshtasticjs.IBLEConnection.readFromCharacteristic: " + e.message);

        }

    }


    // Opens the browsers native select device dialog, listing devices based on the applied filter
    // Later: use getDevices() to get a list of in-range ble devices that can be connected to, useful for displaying a list of devices in 
    // an own UI, bypassing the browsers select/pairing dialog
    async _requestDevice(requestDeviceFilterParams) {

        let device;

        if (requestDeviceFilterParams === false) {
            if(!requestDeviceFilterParams.hasOwnProperty('filters')) {
                requestDeviceFilterParams = { filters: [{ services: [constants.SERVICE_UUID] }] };
            }
        } 
        

        try {
            device = await navigator.bluetooth.requestDevice(requestDeviceFilterParams);
            return device;
        }
        catch (e) {
            throw new Error('Error in meshtasticjs.IBLEConnection.requestDevice: ' + e.message);

        }
        
        
    
    }
    

    async _connectToDevice(device) {
        // Human-readable name of the device.
        if (SettingsManager.debugMode) { console.log('selected ' + device.name + ', trying to connect now'); }

        let connection;

        try {
            connection = await device.gatt.connect();
        }
        catch (e) {
            throw new Error('Error in meshtasticjs.IBLEConnection.connectToDevice: ' + e.message);

        }

        return connection;
      
    }


    async _getService(connection) {


        let service;

        try {
            service = await connection.getPrimaryService(constants.SERVICE_UUID);
        }
        catch (e) {
            throw new Error('Error in meshtasticjs.IBLEConnection.getService: ' + e.message);

        }

        return service;
    
    }
    

    async _getCharacteristics(service) {

        try {
            this.toRadioCharacteristic = await service.getCharacteristic(constants.TORADIO_UUID);
            if (SettingsManager.debugMode) { console.log("successfully got characteristic "); console.log(this.toRadioCharacteristic); }
            this.fromRadioCharacteristic = await service.getCharacteristic(constants.FROMRADIO_UUID);
            if (SettingsManager.debugMode) { console.log("successfully got characteristic "); console.log(this.toRadioCharacteristic); }
            this.fromNumCharacteristic = await service.getCharacteristic(constants.FROMNUM_UUID);
            if (SettingsManager.debugMode) { console.log("successfully got characteristic "); console.log(this.toRadioCharacteristic); }
            
        }
        catch (e) {
            throw new Error('Error in meshtasticjs.IBLEConnection.getCharacteristics: ' + e.message);

        }
        
        return 0;
    
    }

    // BLE notify characteristic published by device, gets called when new fromRadio is available for read
    async _subscribeToBLENotification() {
        await this.fromNumCharacteristic.startNotifications();
        this.fromNumCharacteristic.addEventListener('characteristicvaluechanged', this._handleBLENotification.bind(this)); // bind.this makes the object reference to IBLEConnection accessible within the callback

        if (SettingsManager.debugMode) { console.log('BLE notifications activated'); }
    }

    // GATT connection state events (connect, disconnect)
    _subscribeToBLEConnectionEvents() {

        this.device.addEventListener('gattserverdisconnected', this._handleBLEDisconnect.bind(this));

        
    }


    _handleBLENotification(event) {
        if (SettingsManager.debugMode) { console.log('BLE notification received'); console.log(event); }
        try {
            this._readFromRadio();
        } catch (e) {
            if (SettingsManager.debugMode) { console.log(e); }
        }
        
    }


    _handleBLEDisconnect() {

        this._onDisconnected();

        if (this.userInitiatedDisconnect === false) {

            this.isReconnecting = true;

            exponentialBackoff(3 /* max retries */, 2 /* seconds delay */,
                async function toTry() {
                  await this.connect(this.device);
                }.bind(this),
                function success() {
                  
                },
                function fail() {
                    throw new Error('Error in meshtasticjs.IBLEConnection.handleBLEDisconnect. Failed to reconnect');
                });
        
        } 
        
    }


}