import { Types } from "../index.js";
import {
  fromNumUUID,
  fromRadioUUID,
  serviceUUID,
  toRadioUUID,
} from "../constants.js";
import { IMeshDevice } from "../iMeshDevice.js";
import { typedArrayToBuffer } from "../utils/general.js";

/** Allows to connect to a Meshtastic device via bluetooth */
export class IBLEConnection extends IMeshDevice {
  /** Defines the connection type as ble */
  connType: Types.ConnectionTypeName;

  /** Currently connected BLE device */
  device: BluetoothDevice | undefined;

  GATTServer: BluetoothRemoteGATTServer | undefined;

  /** Short Description */
  service: BluetoothRemoteGATTService | undefined;

  /** Short Description */
  toRadioCharacteristic: BluetoothRemoteGATTCharacteristic | undefined;

  /** Short Description */
  fromRadioCharacteristic: BluetoothRemoteGATTCharacteristic | undefined;

  /** Short Description */
  fromNumCharacteristic: BluetoothRemoteGATTCharacteristic | undefined;

  /** States if the device was force disconnected by a user */
  userInitiatedDisconnect: boolean;

  constructor(configId?: number) {
    super(configId);

    this.log = this.log.getSubLogger({ name: "iHttpConnection" });

    this.connType = "ble";
    this.device = undefined;
    this.service = undefined;
    this.GATTServer = undefined;
    this.toRadioCharacteristic = undefined;
    this.fromRadioCharacteristic = undefined;
    this.fromNumCharacteristic = undefined;
    this.userInitiatedDisconnect = false;
    // this.pendingRead = false;

    this.log.debug(
      Types.Emitter[Types.Emitter.constructor],
      "🔷 iBleConnection instantiated",
    );
  }

  /**
   * Gets web bluetooth support avaliability for the device
   *
   * @returns {Promise<void>}
   */
  public supported(): Promise<boolean> {
    return navigator.bluetooth.getAvailability();
  }

  /**
   * Gets list of bluetooth devices that can be passed to `connect`
   *
   * @returns {Promise<BluetoothDevice[]>} Array of avaliable BLE devices
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
        filters: [{ services: [serviceUUID] }],
      },
    );
  }

  /**
   * Initiates the connect process to a Meshtastic device via Bluetooth
   */
  public async connect({
    device,
    deviceFilter,
  }: Types.BLEConnectionParameters): Promise<void> {
    /** Set device state to connecting */
    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTING);

    /** Set device if specified, else request. */
    this.device = device ?? (await this.getDevice(deviceFilter));

    /** Setup event listners */
    this.device.addEventListener("gattserverdisconnected", () => {
      this.log.info(
        Types.Emitter[Types.Emitter.connect],
        "Device disconnected",
      );
      this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
      this.complete();
    });

    /** Connect to device */
    await this.device.gatt
      ?.connect()
      .then((server) => {
        this.log.info(
          Types.Emitter[Types.Emitter.connect],
          `✅ Got GATT Server for device: ${server.device.id}`,
        );
        this.GATTServer = server;
      })
      .catch((e: Error) => {
        this.log.error(
          Types.Emitter[Types.Emitter.connect],
          `❌ Failed to connect: ${e.message}`,
        );
      });

    await this.GATTServer?.getPrimaryService(serviceUUID)
      .then((service) => {
        this.log.info(
          Types.Emitter[Types.Emitter.connect],
          `✅ Got GATT Service for device: ${service.device.id}`,
        );
        this.service = service;
      })
      .catch((e: Error) => {
        this.log.error(
          Types.Emitter[Types.Emitter.connect],
          `❌ Failed to get primary service: q${e.message}`,
        );
      });

    [toRadioUUID, fromRadioUUID, fromNumUUID].map(async (uuid) => {
      await this.service
        ?.getCharacteristic(uuid)
        .then((characteristic) => {
          this.log.info(
            Types.Emitter[Types.Emitter.connect],
            `✅ Got Characteristic ${characteristic.uuid} for device: ${characteristic.uuid}`,
          );
          switch (uuid) {
            case toRadioUUID:
              this.toRadioCharacteristic = characteristic;
              break;
            case fromRadioUUID:
              this.fromRadioCharacteristic = characteristic;
              break;
            case fromNumUUID:
              this.fromNumCharacteristic = characteristic;
              break;
          }
        })
        .catch((e: Error) => {
          this.log.error(
            Types.Emitter[Types.Emitter.connect],
            `❌ Failed to get toRadio characteristic: q${e.message}`,
          );
        });
    });

    await this.fromNumCharacteristic?.startNotifications(); // TODO: catch

    this.fromNumCharacteristic?.addEventListener(
      "characteristicvaluechanged",
      () => {
        void this.readFromRadio();
      },
    );

    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTED);

    void this.configure().catch(() => {
      // TODO: FIX, workaround for `wantConfigId` not getting acks.
    });
  }

  /** Disconnects from the Meshtastic device */
  public disconnect(): void {
    this.userInitiatedDisconnect = true;
    this.device?.gatt?.disconnect();
    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
    this.complete();
  }

  /**
   * Pings device to check if it is avaliable
   *
   * @todo Implement
   */
  public async ping(): Promise<boolean> {
    return Promise.resolve(true);
  }

  /** Short description */
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
          readBuffer = value.buffer;

          if (value.byteLength > 0) {
            this.handleFromRadio(new Uint8Array(readBuffer));
          }
          this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTED);
        })
        .catch((e: Error) => {
          readBuffer = new ArrayBuffer(0);
          this.log.error(
            Types.Emitter[Types.Emitter.readFromRadio],
            `❌ ${e.message}`,
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
    await this.readFromRadio();
  }
}
