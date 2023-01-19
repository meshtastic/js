import { IBLEConnection } from "./adapters/iBleConnection.js";
import { IHTTPConnection } from "./adapters/iHttpConnection.js";
import { Types } from "./index.js";
import { ISerialConnection } from "./adapters/iSerialConnection.js";

/**
 * Allows to create new connections to devices and manages them. Alternatively,
 * new connections can be created directly by instantiating their respective the
 * interface classes.
 */
export class Client {
  /** Array containing all created connection interfaces */
  deviceInterfaces: Types.ConnectionType[];

  constructor() {
    this.deviceInterfaces = [];
  }

  /**
   * Creates a new Bluetooth Low Enery connection interface
   */
  public createBLEConnection(configId?: number): IBLEConnection {
    const iBLEConnection = new IBLEConnection(configId);
    this.deviceInterfaces.push(iBLEConnection);
    return iBLEConnection;
  }

  /**
   * Creates a new HTTP(S) connection interface
   */
  public createHTTPConnection(configId?: number): IHTTPConnection {
    const iHTTPConnection = new IHTTPConnection(configId);
    this.deviceInterfaces.push(iHTTPConnection);
    return iHTTPConnection;
  }

  /**
   * Creates a new Serial connection interface
   */
  public createSerialConnection(configId?: number): ISerialConnection {
    const iSerialConnection = new ISerialConnection(configId);
    this.deviceInterfaces.push(iSerialConnection);
    return iSerialConnection;
  }

  /**
   * Adds an already created connection interface to the client
   */
  public addConnection(connectionObj: Types.ConnectionType): void {
    this.deviceInterfaces.push(connectionObj);
  }

  /**
   * Removes a connection interface from the client
   */
  public removeConnection(connectionObj: Types.ConnectionType): void {
    const index = this.deviceInterfaces.indexOf(connectionObj);
    if (index !== -1) {
      this.deviceInterfaces.splice(index, 1);
    }
  }
}
