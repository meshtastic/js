import { IBLEConnection } from "./iBleConnection.js";
import { IHTTPConnection } from "./iHttpConnection.js";
import { ISerialConnection } from "./iSerialConnection.js";
import type { DeviceInterface } from "./types.js";

export type IConnection = IBLEConnection | IHTTPConnection | ISerialConnection;

/**
 * Allows to create new connections to devices and manages them.
 * Alternatively, new connections can be created directly by instantiating
 * their respective the interface classes.
 */
export class Client {
  /**
   * Array containing all created connection interfaces
   */
  deviceInterfaces: Array<IBLEConnection | IHTTPConnection | ISerialConnection>;

  constructor() {
    this.deviceInterfaces = [];
  }

  /**
   * Creates a new Bluetooth Low Enery connection interface
   */
  public createBLEConnection(): IBLEConnection {
    const iBLEConnection = new IBLEConnection();
    this.deviceInterfaces.push(iBLEConnection);
    return iBLEConnection;
  }

  /**
   * Creates a new HTTP(S) connection interface
   */
  public createHTTPConnection(): IHTTPConnection {
    const iHTTPConnection = new IHTTPConnection();
    this.deviceInterfaces.push(iHTTPConnection);
    return iHTTPConnection;
  }

  /**
   * Creates a new Serial connection interface
   */
  public createSerialConnection(): ISerialConnection {
    const iSerialConnection = new ISerialConnection();
    this.deviceInterfaces.push(iSerialConnection);
    return iSerialConnection;
  }

  /**
   * Adds an already created connection interface to the client
   * @param connectionObj Desired Bluetooth, Serial or HTTP connection to add
   */
  public addConnection(connectionObj: DeviceInterface): void {
    this.deviceInterfaces.push(connectionObj);
  }

  /**
   * Removes a connection interface from the client
   * @param connectionObj Desired Bluetooth, Serial or HTTP connection to remove
   */
  public removeConnection(connectionObj: DeviceInterface): void {
    const index = this.deviceInterfaces.indexOf(connectionObj);
    if (index !== -1) {
      this.deviceInterfaces.splice(index, 1);
    }
  }
}
