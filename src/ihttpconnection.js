import * as constants from "./constants.js"
import { SettingsManager } from "./settingsmanager.js"
import { IMeshDevice } from "./imeshdevice";
import { exponentialBackoff, typedArrayToBuffer } from "./utils.js"

/**
 * Allows to connect to a meshtastic device over HTTP(S)
 * @extends IMeshDevice
 */
export class IHTTPConnection extends IMeshDevice {


    constructor() {
        super();

        /** @type {string} */
        this.url = undefined;
        /** @type {boolean} */
        this.tls = undefined;

        /** @type {string} */
        this.fetchMode = undefined;
        /** @type {number} */
        this.fetchInterval = undefined;

        /** @type {number} */
        this.lastInteractionTime = undefined;
        /** @type {number} */
        this.consecutiveFailedRequests = 0;
    }

    /**
     * Initiates the connect process to a meshtastic device via HTTP(S)
     * @param {string} [address=undefined] The IP Address/Domain to connect to, without protocol
     * @param {boolean} [tls=undefined] Enables transport layer security. Notes: Slower, devices' certificate must be trusted by the browser
     * @param {string} [fetchMode=undefined] Defines how new messages are fetched, takes 'slow', 'balanced', 'fast', 'stream'
     * @param {string} [fetchInterval=undefined] Sets a fixed interval in that the device is fetched for new messages
     * @param {boolean} [noAutoConfig=false] connect to the device without configuring it. Requires to call configure() manually
     * @returns {number} 0 on success
     */
    async connect(address, tls=undefined, fetchMode=undefined, fetchInterval=undefined, noAutoConfig=false) {

        if (this.isConnected === true) {
            throw new Error('Error in meshtasticjs.IHTTPConnection.connect: Device is already connected');
        }

        this.consecutiveFailedRequests = 0;

        // Generate URL

        var proto;
        
        if (this.url !== undefined && address === undefined && tls === undefined) {
            // Do nothing as url has already been set in previous connect
            // and no new params have been given
        
        } else {

            // Set the address
            if (address === undefined) {
                throw new Error('Error in meshtasticjs.IBLEConnection.connect: Please specify connect address');
            }
    
            // set the protocol
            if (tls === undefined) {
                this.tls = false;
            } else {
                this.tls = tls;
            }

            if (this.tls === true) {
                proto = 'https://';
            } else {
                proto = 'http://';
            }
            
            // assemble url
            this.url = proto + address;
            
        }


        // At this point device is (presumably) connected, maybe check with ping-like request first
        this.isConnected = true;

        await this._onConnected(noAutoConfig);

        // Implement reading from device config here: fetchMode and Interval

        this.fetchMode = fetchMode;
        this.fetchInterval = fetchInterval;

        this.lastInteractionTime = Date.now();
        setTimeout(this._fetchTimer.bind(this), 5000);

        return 0;

    }

    /**
     * Disconnects from the meshtastic device
     * @returns {number} 0 on success, 1 if device is already disconnected
     */
    disconnect() {

        if (this.isConnected === false) {
            if (SettingsManager.debugMode) { console.log('meshtasticjs.IHTTPConnection.disconnect: device already disconnected'); }
            return 1;
        } 

        this._onDisconnected();

    }


    async _readFromRadio() {

        var readBuffer = new ArrayBuffer(1);
        
        // read as long as the previous read buffer is bigger 0
        while (readBuffer.byteLength > 0) {

            try {
                readBuffer = await this._httpRequest(this.url + '/api/v1/fromradio', 'GET');

                console.log(readBuffer);
                
                if (readBuffer.byteLength > 0) {
                    this.lastInteractionTime = Date.now();
                    await this._handleFromRadio(new Uint8Array(readBuffer, 0));
                }
                
            } catch (e) {
                this.consecutiveFailedRequests++;
                throw new Error("Error in meshtasticjs.IHTTPConnection.readFromRadio: " + e.message);
            }

        }
    }


    async _writeToRadio(ToRadioUInt8Array) {

        this.timeSinceLastInteraction = Date.now();

        try {
            await this._httpRequest(this.url + '/api/v1/fromradio', 'PUT', typedArrayToBuffer(ToRadioUInt8Array));
        } catch (e) {
            this.consecutiveFailedRequests++;
            throw new Error("Error in meshtasticjs.IHTTPConnection.writeToRadio: " + e.message);
        }

        

    }


    async _httpRequest(url, type='GET', toRadioBuffer=undefined) {

        switch (type) {
            case 'GET':
                // cant use mode: no-cors here, because browser then obscures if request was successful
                var response = await fetch(url, {
                    method: 'GET'
                });

                break;
            case 'PUT':

                var response = await fetch(this.url + '/api/v1/toradio', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/x-protobuf'
                      },
                    body: toRadioBuffer
                });
                
                break;
            default:
                break;
        }

        if (response.status === 200) {
            // Response is a ReadableStream
            return response.arrayBuffer();
        } else {
            throw new Error('HTTP request failed with status code ' + response.status);
        }
        
    }


    async _fetchTimer() {

        if (this.consecutiveFailedRequests > 3) {
            if (this.isConnected === true) {
                this.disconnect();
            }
            return;
        }

        try {
           let r = await this._readFromRadio();

        } catch (e) {
            if (SettingsManager.debugMode) { console.log(e); }
        }

        // Calculate new interval and set timeout again
        let newInterval = 5000;

        if (this.fetchInterval === undefined) {
            
            // Interval fetch profile 1
            
            if (this.tls === true) {
                newInterval = 10000;
            }
            let timeSinceLastInteraction = Date.now() - this.lastInteractionTime;
            if (timeSinceLastInteraction > 1200000) { // If no action in 20 mins
                newInterval = 120000;
            }
            else if (timeSinceLastInteraction > 600000) { // If no action in 10 mins
                newInterval = 30000;
            }
            else if (timeSinceLastInteraction > 180000) { // If no action in 3 mins
                newInterval = 20000;
            }
            else if (timeSinceLastInteraction > 30000) { // If no action in 30 secs
                newInterval = 15000;
                
            }

        } else {
            newInterval = this.fetchInterval;
        }

        setTimeout(this._fetchTimer.bind(this), newInterval);

    }
    
}