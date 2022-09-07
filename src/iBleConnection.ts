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
   * Defines the connection type as ble
   */
  connType: string;

  /**
   * Currently connected BLE device
   */
  device: BluetoothDevice | void;

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
   * Set when a read promise has yet to be resolved, to prevent simultaneous reads.
   */
  // pendingRead: boolean;

  constructor(configId?: number) {
    super(configId);

    this.connType = "ble";
    this.device = undefined;
    this.service = undefined;
    this.toRadioCharacteristic = undefined;
    this.fromRadioCharacteristic = undefined;
    this.fromNumCharacteristic = undefined;
    this.userInitiatedDisconnect = false;
    // this.pendingRead = false;
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
  }

  /**
   * Initiates the connect process to a Meshtastic device via Bluetooth
   * @param parameters ble connection parameters
   */
  public async connect({
    device,
    deviceFilter
  }: BLEConnectionParameters): Promise<void> {
    /**
     * Check for API avaliability
     */
    if (!navigator.bluetooth) {
      this.log(
        Types.EmitterScope.iBleConnection,
        Types.Emitter.connect,
        `This browser doesn't support the WebBluetooth API`,
        LogRecord_Level.WARNING
      );
    }

    /**
     * Set device state to connecting
     */
    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTING);

    /**
     * Set device if specified, else request.
     */
    this.device = device ?? (await this.getDevice(deviceFilter));

    /**
     * Setup event listners
     */
    this.device.addEventListener("gattserverdisconnected", () => {
      this.log(
        Types.EmitterScope.iBleConnection,
        Types.Emitter.connect,
        "Device disconnected",
        LogRecord_Level.INFO
      );
      this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
      this.complete();
    });

    /**
     * Connect to device
     */
    await this.device.gatt?.connect();

    this.service = await this.device.gatt?.getPrimaryService(SERVICE_UUID);

    this.toRadioCharacteristic = await this.service?.getCharacteristic(
      TORADIO_UUID
    );

    this.fromRadioCharacteristic = await this.service?.getCharacteristic(
      FROMRADIO_UUID
    );

    this.fromNumCharacteristic = await this.service?.getCharacteristic(
      FROMNUM_UUID
    );

    await this.fromNumCharacteristic?.startNotifications();

    this.fromNumCharacteristic?.addEventListener(
      "characteristicvaluechanged",
      () => {
        void this.readFromRadio();
      }
    );

    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTED);

    await this.configure();
  }

  /**
   * Disconnects from the Meshtastic device
   */
  public disconnect(): void {
    this.userInitiatedDisconnect = true;
    this.device?.gatt?.disconnect();
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
    // if (this.pendingRead) {
    //   return Promise.resolve();
    // }
    // this.pendingRead = true;
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
            Types.EmitterScope.iBleConnection,
            Types.Emitter.readFromRadio,
            message,
            LogRecord_Level.ERROR
          );
        });
    }
    // this.pendingRead = false;
  }

  /**
   * Sends supplied protobuf message to the radio
   */
  protected async writeToRadio(data: Uint8Array): Promise<void> {
    await this.toRadioCharacteristic?.writeValue(typedArrayToBuffer(data));
    // This should be automatic (onCharacteristicValueChanged)
    // await this.readFromRadio();
  }
}
