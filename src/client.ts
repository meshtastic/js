import { IBLEConnection } from "./iBleConnection.js";
import { IHTTPConnection } from "./iHttpConnection.js";
import { Types } from "./index.js";
import { ISerialConnection } from "./iSerialConnection.js";

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
   *
   * @param {number} [configId] Desired instance config ID
   * @returns {IBLEConnection} Resulting BLE connection object
   */
  public createBLEConnection(configId?: number): IBLEConnection {
    const iBLEConnection = new IBLEConnection(configId);
    this.deviceInterfaces.push(iBLEConnection);
    return iBLEConnection;
  }

  /**
   * Creates a new HTTP(S) connection interface
   *
   * @param {number} [configId] Desired instance config ID
   * @returns {IHTTPConnection} Resulting HTTP connection object
   */
  public createHTTPConnection(configId?: number): IHTTPConnection {
    const iHTTPConnection = new IHTTPConnection(configId);
    this.deviceInterfaces.push(iHTTPConnection);
    return iHTTPConnection;
  }

  /**
   * Creates a new Serial connection interface
   *
   * @param {number} [configId] Desired instance config ID
   * @returns {ISerialConnection} Resulting Serial connection object
   */
  public createSerialConnection(configId?: number): ISerialConnection {
    const iSerialConnection = new ISerialConnection(configId);
    this.deviceInterfaces.push(iSerialConnection);
    return iSerialConnection;
  }

  /**
   * Adds an already created connection interface to the client
   *
   * @param {Types.IConnectionType} connectionObj Desired BLE, Serial or HTTP
   *   connection to add
   * @returns {void}
   */
  public addConnection(connectionObj: Types.ConnectionType): void {
    this.deviceInterfaces.push(connectionObj);
  }

  /**
   * Removes a connection interface from the client
   *
   * @param {Types.IConnectionType} connectionObj Desired Bluetooth, Serial or
   *   HTTP connection to remove
   * @returns {void}
   */
  public removeConnection(connectionObj: Types.ConnectionType): void {
    const index = this.deviceInterfaces.indexOf(connectionObj);
    if (index !== -1) {
      this.deviceInterfaces.splice(index, 1);
    }
  }
}
