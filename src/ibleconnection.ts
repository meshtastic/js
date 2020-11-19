import * as constants from "./constants";
import { IMeshDevice } from "./imeshdevice";
import { DebugLevelEnum } from "./settingsmanager";
import { exponentialBackoff, typedArrayToBuffer, debugLog } from "./utils";

/**
 * Allows to connect to a meshtastic device via bluetooth
 */
export class IBLEConnection extends IMeshDevice {
  /**
   * Currently connected BLE device
   */
  device: BluetoothDevice;

  /**
   * Connection interface to currently connected BLE device
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
   * @param requestDeviceFilterParams Optional filter options for the web bluetooth api requestDevice() method
   * @param noAutoConfig Connect to the device without configuring it. Requires to call configure() manually
   */
  async connect(
    requestDeviceFilterParams?: RequestDeviceOptions,
    noAutoConfig = false
  ) {
    if (this.isConnected) {
      throw new Error(
        "Error in meshtasticjs.IBLEConnection.connect: Device is already connected"
      );
    } else if (!navigator.bluetooth) {
      throw new Error(
        "Error in meshtasticjs.IBLEConnection.connect: this browser doesn't support the bluetooth web api, see https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API"
      );
    }

    try {
      // If no device has been selected, open request device browser prompt
      if (!this.device) {
        this.device = await this.requestDevice(requestDeviceFilterParams);
      }

      if (!this.isReconnecting) {
        this.subscribeToBLEConnectionEvents();
      }

      this.connection = await this.connectToDevice(this.device);

      this.service = await this.getService(this.connection);

      await this.getCharacteristics(this.service);

      await this.subscribeToBLENotification();

      this.isConnected = true;

      await this.onConnected(noAutoConfig);
    } catch (e) {
      throw new Error(
        `Error in meshtasticjs.IBLEConnection.connect: ${e.message}`
      );
    }
  }

  /**
   * Disconnects from the meshtastic device
   */
  disconnect() {
    this.userInitiatedDisconnect = true;

    if (!this.isConnected && !this.isReconnecting) {
      debugLog(
        "meshtasticjs.IBLEConnection.disconnect: device already disconnected",
        DebugLevelEnum.INFO
      );
    } else if (!this.isConnected && this.isReconnecting) {
      debugLog(
        "meshtasticjs.IBLEConnection.disconnect: reconnect cancelled",
        DebugLevelEnum.DEBUG
      );
    }

    /**
     * No need to call parent _onDisconnected here, calling disconnect() triggers gatt event
     */
    this.connection.disconnect();
  }

  /**
   * Short description
   */
  async readFromRadio() {
    let readBuffer = new ArrayBuffer(1);

    // read as long as the previous read buffer is bigger 0
    while (readBuffer.byteLength > 0) {
      readBuffer = await this.readFromCharacteristic(
        this.fromRadioCharacteristic
      ).catch((e) => {
        throw new Error(
          `Error in meshtasticjs.IBLEConnection.readFromRadio: ${e.message}`
        );
      });

      if (readBuffer.byteLength > 0) {
        await this.handleFromRadio(new Uint8Array(readBuffer, 0));
      }
    }
  }

  /**
   * Short description
   */
  async writeToRadio(ToRadioUInt8Array: Uint8Array) {
    await this.toRadioCharacteristic.writeValue(
      typedArrayToBuffer(ToRadioUInt8Array)
    );
  }

  /**
   * Short description
   */
  private async readFromCharacteristic(
    characteristic: BluetoothRemoteGATTCharacteristic
  ) {
    return (
      await characteristic.readValue().catch((e) => {
        throw new Error(
          `Error in meshtasticjs.IBLEConnection.readFromCharacteristic: ${e.message}`
        );
      })
    ).buffer;
  }

  /**
   * Opens the browsers native select device dialog, listing devices based on the applied filter
   * Later: use getDevices() to get a list of in-range ble devices that can be connected to, useful for displaying a list of devices in
   * an own UI, bypassing the browsers select/pairing dialog
   * @param requestDeviceFilterParams Bluetooth device request filters
   */
  private async requestDevice(
    requestDeviceFilterParams?: RequestDeviceOptions
  ) {
    if (!requestDeviceFilterParams?.hasOwnProperty("filters")) {
      requestDeviceFilterParams = {
        filters: [{ services: [constants.SERVICE_UUID] }],
      };
    }
    return navigator.bluetooth
      .requestDevice(requestDeviceFilterParams as RequestDeviceOptions)
      .catch((e) => {
        throw new Error(
          `Error in meshtasticjs.IBLEConnection.requestDevice: ${e.message}`
        );
      });
  }

  /**
   * Connect to the specified bluetooth device
   * @param device Desired Bluetooth device
   */
  private async connectToDevice(device: BluetoothDevice) {
    debugLog(
      `selected ${device.name}, trying to connect now`,
      DebugLevelEnum.DEBUG
    );

    return device.gatt.connect().catch((e) => {
      throw new Error(
        `Error in meshtasticjs.IBLEConnection.connectToDevice: ${e.message}`
      );
    });
  }

  /**
   * Short description
   * @param connection
   */
  private async getService(connection: BluetoothRemoteGATTServer) {
    return connection.getPrimaryService(constants.SERVICE_UUID).catch((e) => {
      throw new Error(
        `Error in meshtasticjs.IBLEConnection.getService: ${e.message}`
      );
    });
  }

  /**
   * Short description
   * @param service
   */
  private async getCharacteristics(service: BluetoothRemoteGATTService) {
    try {
      this.toRadioCharacteristic = await service.getCharacteristic(
        constants.TORADIO_UUID
      );
      debugLog("successfully got toRadioCharacteristic ", DebugLevelEnum.DEBUG);
      this.fromRadioCharacteristic = await service.getCharacteristic(
        constants.FROMRADIO_UUID
      );
      debugLog(
        "successfully got fromRadioCharacteristic ",
        DebugLevelEnum.DEBUG
      );
      this.fromNumCharacteristic = await service.getCharacteristic(
        constants.FROMNUM_UUID
      );
      debugLog("successfully got fromNumCharacteristic ", DebugLevelEnum.DEBUG);
    } catch (e) {
      throw new Error(
        `Error in meshtasticjs.IBLEConnection.getCharacteristics: ${e.message}`
      );
    }
  }

  /**
   * BLE notify characteristic published by device, gets called when new fromRadio is available for read
   */
  private async subscribeToBLENotification() {
    await this.fromNumCharacteristic.startNotifications();
    this.fromNumCharacteristic.addEventListener(
      "characteristicvaluechanged",
      this.handleBLENotification.bind(this)
    ); // bind.this makes the object reference to IBLEConnection accessible within the callback

    debugLog("BLE notifications activated", DebugLevelEnum.DEBUG);
  }

  /**
   * GATT connection state events (connect, disconnect)
   */
  private subscribeToBLEConnectionEvents() {
    this.device.addEventListener(
      "gattserverdisconnected",
      this.handleBLEDisconnect.bind(this)
    );
  }

  /**
   * Short description
   * @todo verify that event is a string
   * @param event
   */
  private async handleBLENotification(event: string) {
    debugLog(`BLE notification received: ${event}`, DebugLevelEnum.DEBUG);

    await this.readFromRadio().catch((e) => {
      debugLog(e, DebugLevelEnum.ERROR);
    });
  }

  /**
   * Short description
   */
  private handleBLEDisconnect() {
    this.onDisconnected();

    if (!this.userInitiatedDisconnect) {
      this.isReconnecting = true;

      const toTry = async () => {
        await this.connect();
      };

      const success = () => {
        this.isReconnecting = false;
      };

      const fail = () => {
        debugLog(
          "Automatic reconnect promise failed, this can be ignored if deviced reconnected successfully",
          DebugLevelEnum.DEBUG
        );
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
