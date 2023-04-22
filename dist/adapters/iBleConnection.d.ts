/// <reference types="web-bluetooth" />
import { Types } from "../index.js";
import { IMeshDevice } from "../iMeshDevice.js";
/** Allows to connect to a Meshtastic device via bluetooth */
export declare class IBLEConnection extends IMeshDevice {
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
    constructor(configId?: number);
    /**
     * Gets web bluetooth support avaliability for the device
     *
     * @returns {Promise<void>}
     */
    supported(): Promise<boolean>;
    /**
     * Gets list of bluetooth devices that can be passed to `connect`
     *
     * @returns {Promise<BluetoothDevice[]>} Array of avaliable BLE devices
     */
    getDevices(): Promise<BluetoothDevice[]>;
    /**
     * Opens browser dialog to select a device
     */
    getDevice(filter?: RequestDeviceOptions): Promise<BluetoothDevice>;
    /**
     * Initiates the connect process to a Meshtastic device via Bluetooth
     */
    connect({ device, deviceFilter, }: Types.BLEConnectionParameters): Promise<void>;
    /** Disconnects from the Meshtastic device */
    disconnect(): void;
    /**
     * Pings device to check if it is avaliable
     *
     * @todo Implement
     */
    ping(): Promise<boolean>;
    /** Short description */
    protected readFromRadio(): Promise<void>;
    /**
     * Sends supplied protobuf message to the radio
     */
    protected writeToRadio(data: Uint8Array): Promise<void>;
}
