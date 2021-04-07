import { Types } from "./";
import {
  FROMNUM_UUID,
  FROMRADIO_UUID,
  SERVICE_UUID,
  TORADIO_UUID
} from "./constants";
import { LogRecord_Level } from "./generated/mesh";
import { IMeshDevice } from "./imeshdevice";
import { log, typedArrayToBuffer } from "./utils";

/**
 * Allows to connect to a meshtastic device via bluetooth
 */
export class IBLEConnection extends IMeshDevice {
  /**
   * Currently connected BLE device
   */
  device: BluetoothDevice | undefined;

  /**
   * Connection interface to currently connected BLE device
   */
  connection: BluetoothRemoteGATTServer | undefined;

  /**
   * Short Description
   */
  service: BluetoothRemoteGATTService | undefined;

  /**
   * Short Description
   */
  toRadioCharacteristic: BluetoothRemoteGATTCharacteristic | undefined;

  /**
   * Short Description
   */
  fromRadioCharacteristic: BluetoothRemoteGATTCharacteristic | undefined;

  /**
   * Short Description
   */
  fromNumCharacteristic: BluetoothRemoteGATTCharacteristic | undefined;

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
  public async connect(requestDeviceFilterParams?: RequestDeviceOptions) {
    if (!navigator.bluetooth) {
      log(
        `IBLEConnection.connect`,
        `This browser doesn't support the WebBluetooth API`,
        LogRecord_Level.WARNING
      );
    }

    /**
     * If no device has been selected, open request device browser prompt
     */
    if (!this.device) {
      const device = await this.requestDevice(requestDeviceFilterParams);
      if (!device) {
        log(
          `IBLEConnection.connect`,
          `No device selected`,
          LogRecord_Level.ERROR
        );
      } else {
        this.device = device;
      }
    } else {
      if (this.deviceStatus > Types.DeviceStatusEnum.DEVICE_RECONNECTING) {
        /**
         * @todo look into the `advertisementreceived` event
         */
        this.device.addEventListener("gattserverdisconnected", () => {
          this.onDeviceStatusEvent.next(
            Types.DeviceStatusEnum.DEVICE_DISCONNECTED
          );

          if (!this.userInitiatedDisconnect) {
            if (
              this.deviceStatus !== Types.DeviceStatusEnum.DEVICE_RECONNECTING
            ) {
              this.onDeviceStatusEvent.next(
                Types.DeviceStatusEnum.DEVICE_RECONNECTING
              );
            }

            /**
             * @replace with setInterval or setTimeout
             */

            //  setTimeout(() => {
            //   await this.connect(requestDeviceFilterParams);
            // }, 10000);
          }
        });
      }
      const connection = await this.connectToDevice(this.device);

      if (connection && this.service) {
        this.connection = connection;

        const service = await this.getService(this.connection);

        if (service) {
          this.service = service;
        } else {
          log(
            `IBLEConnection.connect`,
            `Service has not been establised`,
            LogRecord_Level.ERROR
          );
        }

        await this.getCharacteristics(this.service);

        await this.subscribeToBLENotification();

        this.onDeviceStatusEvent.next(Types.DeviceStatusEnum.DEVICE_CONNECTED);

        await this.configure();
      } else {
        log(
          `IBLEConnection.connect`,
          `Connection has not been establised`,
          LogRecord_Level.ERROR
        );
      }
    }
  }

  /**
   * Disconnects from the meshtastic device
   */
  public disconnect() {
    this.userInitiatedDisconnect = true;
    if (this.connection) {
      this.connection.disconnect();
      this.onDeviceStatusEvent.next(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
    }
  }

  /**
   * Pings device to check if it is avaliable
   * @todo implement
   */
  public async ping() {
    return true;
  }

  /**
   * Short description
   */
  protected async readFromRadio() {
    let readBuffer = new ArrayBuffer(1);

    while (readBuffer.byteLength > 0 && this.fromRadioCharacteristic) {
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
          log(`IBLEConnection.readFromRadio`, e.message, LogRecord_Level.ERROR);
          if (
            this.deviceStatus !== Types.DeviceStatusEnum.DEVICE_RECONNECTING
          ) {
            this.onDeviceStatusEvent.next(
              Types.DeviceStatusEnum.DEVICE_RECONNECTING
            );
          }

          /**
           * @todo, why the empty array buffer
           */
          return new ArrayBuffer(0);
        });
    }
  }

  /**
   * Sends supplied protobuf message to the radio
   */
  protected async writeToRadio(ToRadioUInt8Array: Uint8Array) {
    if (this.toRadioCharacteristic) {
      await this.toRadioCharacteristic.writeValue(
        typedArrayToBuffer(ToRadioUInt8Array)
      );
    }
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
          LogRecord_Level.ERROR
        );
      });
  }

  /**
   * @todo, shorten
   * Opens the browsers native select device dialog, listing devices based on the applied filter
   * Later: use getDevices() to get a list of in-range ble devices that can be connected to, useful for displaying a list of devices in
   * an own UI, bypassing the browsers select/pairing dialog
   * @param requestDeviceFilterParams Bluetooth device request filters
   */
  private async requestDevice(
    requestDeviceFilterParams?: RequestDeviceOptions
  ) {
    /**
     * @todo filters does not exist on RequestDeviceOptions? look into the desired structure of the filter, currently is a union type
     */
    if (!requestDeviceFilterParams?.hasOwnProperty("filters")) {
      requestDeviceFilterParams = {
        filters: [{ services: [SERVICE_UUID] }]
      };
    }
    return navigator.bluetooth
      .requestDevice(requestDeviceFilterParams as RequestDeviceOptions)
      .catch((e) => {
        log(`IBLEConnection.requestDevice`, e.message, LogRecord_Level.ERROR);
      });
  }

  /**
   * Connect to the specified bluetooth device
   * @param device Desired Bluetooth device
   */
  private async connectToDevice(device: BluetoothDevice) {
    /**
     * @todo, is this logging verbose?
     */
    log(
      `IBLEConnection.connectToDevice`,
      `${device.name}, trying to connect now.`,
      LogRecord_Level.DEBUG
    );

    return device.gatt?.connect().catch((e) => {
      log(`IBLEConnection.connectToDevice`, e.message, LogRecord_Level.ERROR);
    });
  }

  /**
   * Short description
   * @todo, include in caller function, does not need it's own method
   * @param connection
   */
  private async getService(connection: BluetoothRemoteGATTServer) {
    return connection.getPrimaryService(SERVICE_UUID).catch((e) => {
      log(`IBLEConnection.getService`, e.message, LogRecord_Level.ERROR);
    });
  }

  /**
   * Short description
   * @todo wtf are some of these?
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
        LogRecord_Level.DEBUG
      );
      this.fromRadioCharacteristic = await service.getCharacteristic(
        FROMRADIO_UUID
      );
      log(
        `IBLEConnection.getCharacteristics`,
        `Successfully got fromRadioCharacteristic.`,
        LogRecord_Level.DEBUG
      );
      this.fromNumCharacteristic = await service.getCharacteristic(
        FROMNUM_UUID
      );
      log(
        `IBLEConnection.getCharacteristics`,
        `Successfully got fromNumCharacteristic.`,
        LogRecord_Level.DEBUG
      );
    } catch (e) {
      log(
        `IBLEConnection.getCharacteristics`,
        e.message,
        LogRecord_Level.ERROR
      );
    }
  }

  /**
   * BLE notify characteristic published by device, gets called when new fromRadio is available for read
   */
  private async subscribeToBLENotification() {
    if (this.fromNumCharacteristic) {
      await this.fromNumCharacteristic.startNotifications();

      this.fromNumCharacteristic.addEventListener(
        "characteristicvaluechanged",
        (event) => {
          this.handleBLENotification(event.type);
        }
      );

      /**
       * @todo isn't this verbose?
       */
      log(
        `IBLEConnection.subscribeToBLENotification`,
        `BLE notifications activated.`,
        LogRecord_Level.DEBUG
      );
    }
  }

  /**
   * Short description
   * @todo, this isn't needed, does almost nothing, only logs a few items.
   * @param event
   */
  private async handleBLENotification(event: string) {
    log(
      `IBLEConnection.handleBLENotification`,
      `BLE notification received: ${event}.`,
      LogRecord_Level.DEBUG
    );

    await this.readFromRadio().catch((e) => {
      log(`IBLEConnection.handleBLENotification`, e, LogRecord_Level.ERROR);
    });
  }
}
