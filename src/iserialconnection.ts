import { IMeshDevice } from "./imeshdevice";

/**
 * Allows to connect to a meshtastic device over HTTP(S)
 * @description NOT YET IMPLEMENTED
 */
export class ISerialConnection extends IMeshDevice {
  constructor() {
    super();
  }

  /**
   */
  public async connect() {
    // console.log(navigator.usb.getDevices());
  }

  /**
   * Disconnects from the meshtastic device
   */
  public disconnect() {}

  /**
   * Pings device to check if it is avaliable
   */
  public async ping() {
    return true;
  }

  /**
   * Short description
   */
  protected async readFromRadio() {}

  /**
   * Short description
   */
  protected async writeToRadio(ToRadioUInt8Array: Uint8Array) {}
}
