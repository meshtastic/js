/// <reference types="w3c-web-serial" />
import { Types } from "../index.js";
import { IMeshDevice } from "../iMeshDevice.js";
/** Allows to connect to a Meshtastic device over WebSerial */
export declare class ISerialConnection extends IMeshDevice {
    /** Defines the connection type as serial */
    connType: Types.ConnectionTypeName;
    /** Serial port used to communicate with device. */
    private port;
    /** Transform stream for parsing raw serial data */
    private transformer?;
    /** Should locks be prevented */
    private preventLock?;
    /**
     * Fires when `disconnect()` is called, used to instruct serial port and
     * readers to release there locks
     *
     * @event onReleaseEvent
     */
    private readonly onReleaseEvent;
    constructor(configId?: number);
    /**
     * Reads packets from transformed serial port steam and processes them.
     */
    private readFromRadio;
    /** Gets list of serial ports that can be passed to `connect` */
    getPorts(): Promise<SerialPort[]>;
    /**
     * Opens browsers connection dialogue to select a serial port
     */
    getPort(filter?: SerialPortRequestOptions): Promise<SerialPort>;
    /**
     * Initiates the connect process to a Meshtastic device via Web Serial
     */
    connect({ port, baudRate, concurrentLogOutput, }: Types.SerialConnectionParameters): Promise<void>;
    /** Disconnects from the serial port */
    reconnect(): Promise<void>;
    /** Disconnects from the serial port */
    disconnect(): Promise<void>;
    /** Pings device to check if it is avaliable */
    ping(): Promise<boolean>;
    /**
     * Sends supplied protobuf message to the radio
     */
    protected writeToRadio(data: Uint8Array): Promise<void>;
}
