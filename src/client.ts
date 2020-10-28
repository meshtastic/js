import { IBLEConnection } from "./ibleconnection";
import { IHTTPConnection } from "./ihttpconnection";
import { ProtobufHandler } from "./protobufs/protobufhandler";

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
    /** @type {Array} */
    this.deviceInterfaces = new Array();

    // Preload protobufhandler singleton, optional
    new ProtobufHandler();
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

  createSerialConnection() {}

  /**
   * Adds an already created connection interface to the client
   * @param connectionObj Desired Bluetooth or HTTP connection to device
   */
  addConnection(connectionObj: IBLEConnection | IHTTPConnection) {
    this.deviceInterfaces.push(connectionObj);
  }
}
