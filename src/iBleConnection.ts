import { Types } from "./index.js";
import {
  FROMNUM_UUID,
  FROMRADIO_UUID,
  SERVICE_UUID,
  TORADIO_UUID
} from "./constants.js";
import { LogRecord_Level } from "./generated/mesh.js";
import { IMeshDevice } from "./iMeshDevice.js";
import type { BLEConnectionParameters } from "./types.js";
import { typedArrayToBuffer } from "./utils/general.js";

/**
 * Allows to connect to a Meshtastic device via bluetooth
 */
export class IBLEConnection extends IMeshDevice {
  /**
   * Currently connected BLE device
   */
  device: BluetoothDevice | void;

  /**
   * Connection interface to currently connected BLE device
   */
  connection: BluetoothRemoteGATTServer | void;

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

  /**
   * Queue that holds data to be written to the device, to prevent simultaneous writes
   */
  writeQueue: Uint8Array[];

  /**
   * Weather the we should currently write to the device or not, to prevent simultaneous writes
   */
  writeLock: boolean;

  /**
   * Set when a read promise has yet to be resolved, to prevent simultaneous reads.
   */
  pendingRead: boolean;

  constructor() {
    super();

    this.device = undefined;
    this.connection = undefined;
    this.service = undefined;
    this.toRadioCharacteristic = undefined;
    this.fromRadioCharacteristic = undefined;
    this.fromNumCharacteristic = undefined;
    this.userInitiatedDisconnect = false;
    this.writeQueue = [];
    this.writeLock = false;
    this.pendingRead = false;
  }

  /**
   * Gets web bluetooth support avaliability for the device
   */
  public supported(): Promise<boolean> {
    return navigator.bluetooth.getAvailability();
  }

  /**
   * Gets list of bluetooth devices that can be passed to `connect`
   */
  public getDevices(): Promise<BluetoothDevice[]> {
    return navigator.bluetooth.getDevices();
  }

  /**
   * Opens browser dialog to select a device
   */
  public getDevice(filter?: RequestDeviceOptions): Promise<BluetoothDevice> {
    return navigator.bluetooth.requestDevice(
      filter ?? {
        filters: [{ services: [SERVICE_UUID] }]
      }
    );
    // .catch(({ message }: { message: string }) => {
    //   this.log(`IBLEConnection.requestDevice`, message, LogRecord_Level.ERROR);
    // });
  }

  /**
   * Initiates the connect process to a Meshtastic device via Bluetooth
   * @param parameters ble connection parameters
   */
  public async connect(parameters: BLEConnectionParameters): Promise<void> {
    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTING);
    if (!navigator.bluetooth) {
      this.log(
        `IBLEConnection.connect`,
        `This browser doesn't support the WebBluetooth API`,
        LogRecord_Level.WARNING
      );
    }

    if (parameters.device) {
      this.device = parameters.device;
    } else {
      this.device = await this.getDevice();
    }

    if (this.device) {
      this.device.gatt
        ?.connect()
        .then(async (connection): Promise<void> => {
          await connection
            .getPrimaryService(SERVICE_UUID)
            .then(async (service) => {
              this.service = service;

              this.toRadioCharacteristic = await service.getCharacteristic(
                TORADIO_UUID
              );
              this.fromRadioCharacteristic = await service.getCharacteristic(
                FROMRADIO_UUID
              );
              this.fromNumCharacteristic = await service.getCharacteristic(
                FROMNUM_UUID
              );

              if (this.fromNumCharacteristic) {
                await this.fromNumCharacteristic.startNotifications();

                this.fromNumCharacteristic.addEventListener(
                  "characteristicvaluechanged",
                  /**
                   * @todo fix
                   */
                  // eslint-disable-next-line @typescript-eslint/no-misused-promises
                  async () => {
                    await this.readFromRadio();
                  }
                );
              }

              this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTED);

              await this.configure();
            })
            .catch(({ message }: { message: string }) => {
              this.log(
                `IBLEConnection.getService`,
                message,
                LogRecord_Level.ERROR
              );
            });
          this.connection = connection;
        })
        .catch(({ message }: { message: string }) => {
          this.log(`IBLEConnection.connect`, message, LogRecord_Level.ERROR);
        });
      this.device.addEventListener("gattserverdisconnected", () => {
        this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);

        if (!this.userInitiatedDisconnect) {
          if (
            this.deviceStatus !== Types.DeviceStatusEnum.DEVICE_RECONNECTING
          ) {
            this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_RECONNECTING);
          }
        }
      });
    }
  }

  /**
   * Disconnects from the Meshtastic device
   */
  public disconnect(): void {
    this.userInitiatedDisconnect = true;
    if (this.connection) {
      this.connection.disconnect();
    }
    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
    this.complete();
  }

  /**
   * Pings device to check if it is avaliable
   * @todo implement
   */
  public async ping(): Promise<boolean> {
    return Promise.resolve(true);
  }

  /**
   * Short description
   */
  protected async readFromRadio(): Promise<void> {
    if (this.pendingRead) {
      return Promise.resolve();
    }
    this.pendingRead = true;
    let readBuffer = new ArrayBuffer(1);

    while (readBuffer.byteLength > 0 && this.fromRadioCharacteristic) {
      await this.fromRadioCharacteristic
        .readValue()
        .then((value) => {
          if (value) {
            readBuffer = value.buffer;

            if (value.byteLength > 0) {
              void this.handleFromRadio(new Uint8Array(readBuffer, 0));
            }
          }
          this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTED);
        })
        .catch(({ message }: { message: string }) => {
          readBuffer = new ArrayBuffer(0);
          this.log(
            `IBLEConnection.readFromRadio`,
            message,
            LogRecord_Level.ERROR
          );
        });
    }
    this.pendingRead = false;
  }

  /**
   * Sends supplied protobuf message to the radio
   */
  protected async writeToRadio(data: Uint8Array): Promise<void> {
    this.writeQueue.push(data);
    if (this.writeLock) {
      return Promise.resolve();
    } else {
      this.writeLock = true;
      if (this.toRadioCharacteristic) {
        while (this.writeQueue.length) {
          if (this.writeQueue[0]) {
            await this.toRadioCharacteristic
              .writeValue(typedArrayToBuffer(this.writeQueue[0]))
              .then(() => {
                this.writeQueue.shift();
              })
              .catch(({ message }: { message: string }) => {
                this.log(
                  `IBLEConnection.writeToRadio`,
                  message,
                  LogRecord_Level.ERROR
                );
              });
          }
        }
      }
    }
  }
}
