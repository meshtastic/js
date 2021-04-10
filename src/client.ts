import { IBLEConnection } from "./ibleconnection";
import { IHTTPConnection } from "./ihttpconnection";
import { ISerialConnection } from "./iserialconnection";
import type { DeviceInterface } from "./types";

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
   * @param connectionObj Desired Bluetooth or HTTP connection to device
   */
  public addConnection(connectionObj: DeviceInterface): void {
    this.deviceInterfaces.push(connectionObj);
  }
}
