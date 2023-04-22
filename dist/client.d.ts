import { IBLEConnection } from "./adapters/iBleConnection.js";
import { IHTTPConnection } from "./adapters/iHttpConnection.js";
import { Types } from "./index.js";
import { ISerialConnection } from "./adapters/iSerialConnection.js";
/**
 * Allows to create new connections to devices and manages them. Alternatively,
 * new connections can be created directly by instantiating their respective the
 * interface classes.
 */
export declare class Client {
    /** Array containing all created connection interfaces */
    deviceInterfaces: Types.ConnectionType[];
    constructor();
    /**
     * Creates a new Bluetooth Low Enery connection interface
     */
    createBLEConnection(configId?: number): IBLEConnection;
    /**
     * Creates a new HTTP(S) connection interface
     */
    createHTTPConnection(configId?: number): IHTTPConnection;
    /**
     * Creates a new Serial connection interface
     */
    createSerialConnection(configId?: number): ISerialConnection;
    /**
     * Adds an already created connection interface to the client
     */
    addConnection(connectionObj: Types.ConnectionType): void;
    /**
     * Removes a connection interface from the client
     */
    removeConnection(connectionObj: Types.ConnectionType): void;
}
