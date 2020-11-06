import { IBLEConnection } from "./ibleconnection";
import { IHTTPConnection } from "./ihttpconnection";

/**
 * Allows to create new connections to devices and manages them.
 * The usage is optional - new connections can be created directly by instantiating
 * the interface classes.
 */
export class Client {
  /**
   * Array of all created connection interfaces
   */
  deviceInterfaces: (IBLEConnection | IHTTPConnection)[];

  constructor() {
    this.deviceInterfaces = new Array();
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
   * @todo implement
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
