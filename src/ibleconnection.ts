import * as constants from "./constants";
import { SettingsManager } from "./settingsmanager";
import { IMeshDevice } from "./imeshdevice";
import { exponentialBackoff, typedArrayToBuffer } from "./utils";

/**
 * Allows to connect to a meshtastic device via bluetooth
 */
export class IBLEConnection extends IMeshDevice {
  /**
   * Short Description
   */
  device: BluetoothDevice;

  /**
   * Short Description
   */
  connection: BluetoothRemoteGATTServer;

  /**
   * Short Description
   */
  service: BluetoothRemoteGATTService;

  /**
   * Short Description
   */
  toRadioCharacteristic: BluetoothRemoteGATTCharacteristic;

  /**
   * Short Description
   */
  fromRadioCharacteristic: BluetoothRemoteGATTCharacteristic;

  /**
   * Short Description
   */
  fromNumCharacteristic: BluetoothRemoteGATTCharacteristic;

  /**
   * States if the device was force disconnected by a user
   */
  userInitiatedDisconnect: boolean;

  /**
   * States if the current device is currently connected or not
   */
  isConnected: boolean;

  /**
   * States if the current device is in a reconnecting state
   */
  isReconnecting: boolean;

  constructor() {
    super();

    this.device = undefined;
    this.connection = undefined;
    this.service = undefined;
    this.toRadioCharacteristic = undefined;
    this.fromRadioCharacteristic = undefined;
    this.fromNumCharacteristic = undefined;
    this.userInitiatedDisconnect = false;
  }

  /**
   * Initiates the connect process to a meshtastic device via bluetooth
   * @todo `change requestDeviceFilterParams` to only pass `RequestDeviceOptions`
   * @todo don't pass this.device to requestDeviceFilterParams
   * @param requestDeviceFilterParams Optional filter options for the web bluetooth api requestDevice() method
   * @param noAutoConfig Connect to the device without configuring it. Requires to call configure() manually
   * @returns 0 on success
   */
  async connect(
    requestDeviceFilterParams:
      | boolean
      | RequestDeviceOptions
      | BluetoothDevice = false,
    noAutoConfig = false
  ) {
    if (this.isConnected === true) {
      throw new Error(
        "Error in meshtasticjs.IBLEConnection.connect: Device is already connected"
      );
    } else if (navigator.bluetooth === undefined) {
      throw new Error(
        "Error in meshtasticjs.IBLEConnection.connect: this browser doesn't support the bluetooth web api, see https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API"
      );
    }

    let device: BluetoothDevice,
      connection: BluetoothRemoteGATTServer,
      service: BluetoothRemoteGATTService;

    try {
      // If no device has been selected, open request device browser prompt
      if (this.device === undefined) {
        device = await this._requestDevice(
          requestDeviceFilterParams as boolean | RequestDeviceOptions
        );
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
    } catch (e) {
      throw new Error(
        "Error in meshtasticjs.IBLEConnection.connect: " + e.message
      );
    }
  }

  /**
   * Disconnects from the meshtastic device
   * @returns 0 on success, 1 if device is already disconnected
   */
  disconnect() {
    this.userInitiatedDisconnect = true; // Don't reconnect

    if (this.isConnected === false && this.isReconnecting === false) {
      if (SettingsManager.debugMode) {
        console.log(
          "meshtasticjs.IBLEConnection.disconnect: device already disconnected"
        );
      }
      return 1;
    } else if (this.isConnected === false && this.isReconnecting === true) {
      if (SettingsManager.debugMode) {
        console.log(
          "meshtasticjs.IBLEConnection.disconnect: reconnect cancelled"
        );
      }
    }

    this.connection.disconnect();
    // No need to call parent _onDisconnected here, calling disconnect() triggers gatt event

    return 0;
  }

  /**
   * Short description
   */
  async _readFromRadio() {
    let readBuffer = new ArrayBuffer(1);

    // read as long as the previous read buffer is bigger 0
    while (readBuffer.byteLength > 0) {
      try {
        readBuffer = await this._readFromCharacteristic(
          this.fromRadioCharacteristic
        );

        if (readBuffer.byteLength > 0) {
          await this._handleFromRadio(new Uint8Array(readBuffer, 0));
        }
      } catch (e) {
        throw new Error(
          "Error in meshtasticjs.IBLEConnection.readFromRadio: " + e.message
        );
      }
    }
  }

  /**
   * Short description
   */
  async _writeToRadio(ToRadioUInt8Array: Uint8Array) {
    let ToRadioBuffer = typedArrayToBuffer(ToRadioUInt8Array);

    await this.toRadioCharacteristic.writeValue(ToRadioBuffer);
  }

  /**
   * Short description
   */
  async _readFromCharacteristic(
    characteristic: BluetoothRemoteGATTCharacteristic
  ) {
    try {
      return (await characteristic.readValue()).buffer;
    } catch (e) {
      throw new Error(
        "Error in meshtasticjs.IBLEConnection.readFromCharacteristic: " +
          e.message
      );
    }
  }

  /**
   * Opens the browsers native select device dialog, listing devices based on the applied filter
   * Later: use getDevices() to get a list of in-range ble devices that can be connected to, useful for displaying a list of devices in
   * an own UI, bypassing the browsers select/pairing dialog
   * @param requestDeviceFilterParams Bluetooth device request filters
   */
  async _requestDevice(
    requestDeviceFilterParams: RequestDeviceOptions | boolean
  ) {
    if (requestDeviceFilterParams === false) {
      if (!requestDeviceFilterParams.hasOwnProperty("filters")) {
        requestDeviceFilterParams = {
          filters: [{ services: [constants.SERVICE_UUID] }],
        };
      }
    }

    try {
      return await navigator.bluetooth.requestDevice(
        requestDeviceFilterParams as RequestDeviceOptions
      );
    } catch (e) {
      throw new Error(
        "Error in meshtasticjs.IBLEConnection.requestDevice: " + e.message
      );
    }
  }

  /**
   * Connect to the specified bluetooth device
   * @param device Desired Bluetooth device
   */
  async _connectToDevice(device: BluetoothDevice) {
    // Human-readable name of the device.
    if (SettingsManager.debugMode) {
      console.log("selected " + device.name + ", trying to connect now");
    }

    let connection: BluetoothRemoteGATTServer; /** @todo optimize */

    try {
      connection = await device.gatt.connect();
    } catch (e) {
      throw new Error(
        "Error in meshtasticjs.IBLEConnection.connectToDevice: " + e.message
      );
    }

    return connection;
  }

  /**
   * Short description
   * @param connection
   */
  async _getService(connection: BluetoothRemoteGATTServer) {
    let service: BluetoothRemoteGATTService; /** @todo optimize */

    try {
      service = await connection.getPrimaryService(constants.SERVICE_UUID);
    } catch (e) {
      throw new Error(
        "Error in meshtasticjs.IBLEConnection.getService: " + e.message
      );
    }

    return service;
  }

  /**
   * Short description
   * @param service
   */
  async _getCharacteristics(service: BluetoothRemoteGATTService) {
    try {
      this.toRadioCharacteristic = await service.getCharacteristic(
        constants.TORADIO_UUID
      );
      if (SettingsManager.debugMode) {
        console.log("successfully got characteristic ");
        console.log(this.toRadioCharacteristic);
      }
      this.fromRadioCharacteristic = await service.getCharacteristic(
        constants.FROMRADIO_UUID
      );
      if (SettingsManager.debugMode) {
        console.log("successfully got characteristic ");
        console.log(this.toRadioCharacteristic);
      }
      this.fromNumCharacteristic = await service.getCharacteristic(
        constants.FROMNUM_UUID
      );
      if (SettingsManager.debugMode) {
        console.log("successfully got characteristic ");
        console.log(this.toRadioCharacteristic);
      }
    } catch (e) {
      throw new Error(
        "Error in meshtasticjs.IBLEConnection.getCharacteristics: " + e.message
      );
    }

    return 0;
  }

  /**
   * BLE notify characteristic published by device, gets called when new fromRadio is available for read
   */
  async _subscribeToBLENotification() {
    await this.fromNumCharacteristic.startNotifications();
    this.fromNumCharacteristic.addEventListener(
      "characteristicvaluechanged",
      this._handleBLENotification.bind(this)
    ); // bind.this makes the object reference to IBLEConnection accessible within the callback

    if (SettingsManager.debugMode) {
      console.log("BLE notifications activated");
    }
  }

  // GATT connection state events (connect, disconnect)
  _subscribeToBLEConnectionEvents() {
    this.device.addEventListener(
      "gattserverdisconnected",
      this._handleBLEDisconnect.bind(this)
    );
  }

  /**
   * Short description
   * @todo verify that event is a string
   * @param event
   */
  async _handleBLENotification(event: string) {
    if (SettingsManager.debugMode) {
      console.log("BLE notification received");
      console.log(event);
    }
    try {
      await this._readFromRadio();
    } catch (e) {
      if (SettingsManager.debugMode) {
        console.log(e);
      }
    }
  }

  /**
   * Short description
   */
  _handleBLEDisconnect() {
    this._onDisconnected();

    if (this.userInitiatedDisconnect === false) {
      this.isReconnecting = true;

      const toTry = async () => {
        await this.connect(this.device);
      };

      const success = () => {
        this.isReconnecting = false;
      };

      const fail = () => {
        if (SettingsManager.debugMode) {
          console.log(
            "Automatic reconnect promise failed, this can be ignored if deviced reconnected successfully"
          );
        }
      };

      exponentialBackoff(
        3 /* max retries */,
        2 /* seconds delay */,
        toTry.bind(this),
        success.bind(this),
        fail
      );
    }
  }
}
