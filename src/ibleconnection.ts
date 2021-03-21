import { Protobuf, Types } from "./";
import {
  FROMNUM_UUID,
  FROMRADIO_UUID,
  SERVICE_UUID,
  TORADIO_UUID
} from "./constants";
import { IMeshDevice } from "./imeshdevice";
import { exponentialBackoff, log, typedArrayToBuffer } from "./utils";

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
   */
  async connect(requestDeviceFilterParams?: RequestDeviceOptions) {
    if (this.deviceStatus >= Types.DeviceStatusEnum.DEVICE_CONNECTED) {
      log(
        `IBLEConnection.connect`,
        `Device is already connected`,
        Protobuf.LogLevelEnum.WARNING
      );
      return;
    } else if (!navigator.bluetooth) {
      log(
        `IBLEConnection.connect`,
        `This browser doesn't support the WebBluetooth API`,
        Protobuf.LogLevelEnum.WARNING
      );
    }

    try {
      /**
       * If no device has been selected, open request device browser prompt
       */
      if (!this.device) {
        const device = await this.requestDevice(requestDeviceFilterParams);
        if (!device) {
          log(
            `IBLEConnection.connect`,
            `No device selected`,
            Protobuf.LogLevelEnum.ERROR
          );
        } else {
          this.device = device;
        }
      }

      if (this.deviceStatus > Types.DeviceStatusEnum.DEVICE_RECONNECTING) {
        this.subscribeToBLEConnectionEvents();
      }

      const connection = await this.connectToDevice(this.device);

      if (connection) {
        this.connection = connection;
      } else {
        log(
          `IBLEConnection.connect`,
          `Connection has not been establised`,
          Protobuf.LogLevelEnum.ERROR
        );
      }

      const service = await this.getService(this.connection);

      if (service) {
        this.service = service;
      } else {
        log(
          `IBLEConnection.connect`,
          `Service has not been establised`,
          Protobuf.LogLevelEnum.ERROR
        );
      }

      await this.getCharacteristics(this.service);

      await this.subscribeToBLENotification();

      await this.onConnected();
    } catch (e) {
      log(`IBLEConnection.connect`, e.message, Protobuf.LogLevelEnum.ERROR);
    }
  }

  /**
   * Disconnects from the meshtastic device
   */
  disconnect() {
    this.userInitiatedDisconnect = true;

    /**
     * No need to call parent onDisconnected here, calling disconnect() triggers gatt event
     */
    this.connection.disconnect();
  }

  /**
   * Pings device to check if it is avaliable
   * @todo implement
   */
  async ping() {
    return true;
  }

  /**
   * Short description
   */
  async readFromRadio() {
    let readBuffer = new ArrayBuffer(1);

    /**
     * read as long as the previous read buffer is bigger 0
     */
    while (readBuffer.byteLength > 0) {
      await this.readFromCharacteristic(this.fromRadioCharacteristic)
        .then((value) => {
          if (value && value.byteLength > 0) {
            this.handleFromRadio(new Uint8Array(readBuffer, 0));
          }
          this.onDeviceStatusEvent.next(
            Types.DeviceStatusEnum.DEVICE_CONNECTED
          );
        })
        .catch((e) => {
          this.consecutiveFailedRequests++;
          log(
            `IBLEConnection.readFromRadio`,
            e.message,
            Protobuf.LogLevelEnum.ERROR
          );
          this.onDeviceStatusEvent.next(
            Types.DeviceStatusEnum.DEVICE_RECONNECTING
          );
          /**
           * @todo exponential backoff here?
           */
          return new ArrayBuffer(0);
        });
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
    return await characteristic
      .readValue()
      .then((value) => {
        return value.buffer;
      })
      .catch((e) => {
        log(
          `IBLEConnection.readFromCharacteristic`,
          e.message,
          Protobuf.LogLevelEnum.ERROR
        );
      });
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
    /**
     * @todo filters does not exist on RequestDeviceOptions?
     */
    if (!requestDeviceFilterParams?.hasOwnProperty("filters")) {
      requestDeviceFilterParams = {
        filters: [{ services: [SERVICE_UUID] }]
      };
    }
    return navigator.bluetooth
      .requestDevice(requestDeviceFilterParams as RequestDeviceOptions)
      .catch((e) => {
        log(
          `IBLEConnection.requestDevice`,
          e.message,
          Protobuf.LogLevelEnum.ERROR
        );
      });
  }

  /**
   * Connect to the specified bluetooth device
   * @param device Desired Bluetooth device
   */
  private async connectToDevice(device: BluetoothDevice) {
    log(
      `IBLEConnection.connectToDevice`,
      `${device.name}, trying to connect now.`,
      Protobuf.LogLevelEnum.DEBUG
    );

    return device.gatt.connect().catch((e) => {
      log(
        `IBLEConnection.connectToDevice`,
        e.message,
        Protobuf.LogLevelEnum.ERROR
      );
    });
  }

  /**
   * Short description
   * @param connection
   */
  private async getService(connection: BluetoothRemoteGATTServer) {
    return connection.getPrimaryService(SERVICE_UUID).catch((e) => {
      log(`IBLEConnection.getService`, e.message, Protobuf.LogLevelEnum.ERROR);
    });
  }

  /**
   * Short description
   * @param service
   */
  private async getCharacteristics(service: BluetoothRemoteGATTService) {
    try {
      this.toRadioCharacteristic = await service.getCharacteristic(
        TORADIO_UUID
      );
      log(
        `IBLEConnection.getCharacteristics`,
        `Successfully got toRadioCharacteristic.`,
        Protobuf.LogLevelEnum.DEBUG
      );
      this.fromRadioCharacteristic = await service.getCharacteristic(
        FROMRADIO_UUID
      );
      log(
        `IBLEConnection.getCharacteristics`,
        `Successfully got fromRadioCharacteristic.`,
        Protobuf.LogLevelEnum.DEBUG
      );
      this.fromNumCharacteristic = await service.getCharacteristic(
        FROMNUM_UUID
      );
      log(
        `IBLEConnection.getCharacteristics`,
        `Successfully got fromNumCharacteristic.`,
        Protobuf.LogLevelEnum.DEBUG
      );
    } catch (e) {
      log(
        `IBLEConnection.getCharacteristics`,
        e.message,
        Protobuf.LogLevelEnum.ERROR
      );
    }
  }

  /**
   * BLE notify characteristic published by device, gets called when new fromRadio is available for read
   */
  private async subscribeToBLENotification() {
    await this.fromNumCharacteristic.startNotifications();
    /**
     * bind.this makes the object reference to IBLEConnection accessible within the callback
     * @todo stop using eventListener
     */
    this.fromNumCharacteristic.addEventListener(
      "characteristicvaluechanged",
      this.handleBLENotification.bind(this)
    );

    log(
      `IBLEConnection.subscribeToBLENotification`,
      `BLE notifications activated.`,
      Protobuf.LogLevelEnum.DEBUG
    );
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
   * @param event
   */
  private async handleBLENotification(event: string) {
    log(
      `IBLEConnection.handleBLENotification`,
      `BLE notification received: ${event}.`,
      Protobuf.LogLevelEnum.DEBUG
    );

    await this.readFromRadio().catch((e) => {
      log(
        `IBLEConnection.handleBLENotification`,
        e,
        Protobuf.LogLevelEnum.ERROR
      );
    });
  }

  /**
   * Short description
   */
  private handleBLEDisconnect() {
    this.onDisconnected();

    if (!this.userInitiatedDisconnect) {
      if (this.deviceStatus !== Types.DeviceStatusEnum.DEVICE_RECONNECTING) {
        this.onDeviceStatusEvent.next(
          Types.DeviceStatusEnum.DEVICE_RECONNECTING
        );
      }

      const toTry = async () => {
        await this.connect();
      };

      const success = () => {
        /**
         * @todo, do we need to reconfigure the device
         */
        this.onDeviceStatusEvent.next(Types.DeviceStatusEnum.DEVICE_CONFIGURED);
      };

      const fail = () => {
        /**
         * Do we need to set the deviceStatus here or call onDisconnect()?
         */
        log(
          `IBLEConnection.handleBLEDisconnect`,
          `Automatic reconnect failed.`,
          Protobuf.LogLevelEnum.DEBUG
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
