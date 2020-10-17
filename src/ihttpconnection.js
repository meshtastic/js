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
        /** @type {number} */
        this.consecutiveFailedRequests = 0;
        /** @type {number} */
        this.fetchTimerIntervalId = undefined;
    }

    /**
     * Initiates the connect process to a meshtastic device via HTTP(S)
     * @param {string} address The IP Address/Domain to connect to, without protocol
     * @param {boolean} [tls=false] Enables transport layer security. Notes: Slower, devices' certificate must be trusted by the browser
     * @param {number}[fetchInterval=10000] Sets the interval in milliseconds how often new messages are fetched from device
     * @param {boolean} [noAutoConfig=false] connect to the device without configuring it. Requires to call configure() manually
     * @returns {number} 0 on success
     */
    async connect(address, tls=false, fetchInterval=10000, noAutoConfig=false) {

        if (this.isConnected === true) {
            if (SettingsManager.debugMode) { console.log('meshtasticjs.IHTTPConnection.connect: device already connected/connecting'); }
            //throw new Error('Error in meshtasticjs.IBLEConnection.connect: Device is already connected');
            return;
        }

        this.consecutiveFailedRequests = 0;

        if (this.url === undefined) {
            var url = undefined;

            if (tls === true) {
                url = 'https://';
            } else {
                url = 'http://';
            }

            this.url = url + address;
        }
        
        // At this point device is (presumably) connected, maybe check with ping-like request first
        this.isConnected = true;

        await this._onConnected(noAutoConfig);

        this.fetchTimerIntervalId = setInterval(this._fetchTimer.bind(this), fetchInterval);

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

        clearInterval(this.fetchTimerIntervalId);
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
                    await this._handleFromRadio(new Uint8Array(readBuffer, 0));
                }
                
            } catch (e) {
                this.consecutiveFailedRequests++;
                throw new Error("Error in meshtasticjs.IHTTPConnection.readFromRadio: " + e.message);
            }

        }
    }


    async _writeToRadio(ToRadioUInt8Array) {

        await this._httpRequest(this.url + '/api/v1/fromradio', 'PUT', typedArrayToBuffer(ToRadioUInt8Array));

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

    // TODO: don't overlap http requests, start the next one only after the previous has timed out
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

    }
    
}