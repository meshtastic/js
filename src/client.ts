import { IBLEConnection } from "./ibleconnection";
import { IHTTPConnection } from "./ihttpconnection";

/**
 * Allows to create new connections to devices and manages them.
 * Alternatively, new connections can be created directly by instantiating
 * their respective the interface classes.
 */
export class Client {
  /**
   * Array containing all created connection interfaces
   */
  deviceInterfaces: Array<IBLEConnection | IHTTPConnection>;

  constructor() {
    this.deviceInterfaces = [];
  }

  /**
   * Creates a new Bluetooth Low Enery connection interface
   */
  createBLEConnection() {
    const iBLEConnection = new IBLEConnection();
    this.deviceInterfaces.push(iBLEConnection);
    return iBLEConnection;
  }

  /**
   * Creates a new HTTP(S) connection interface
   */
  createHTTPConnection() {
    const iHTTPConnection = new IHTTPConnection();
    this.deviceInterfaces.push(iHTTPConnection);
    return iHTTPConnection;
  }

  /**
   * Creates a new Serial connection interface
   */
  createSerialConnection() {}

  /**
   * Adds an already created connection interface to the client
   * @param connectionObj Desired Bluetooth or HTTP connection to device
   */
  addConnection(connectionObj: IBLEConnection | IHTTPConnection) {
    this.deviceInterfaces.push(connectionObj);
  }
}
