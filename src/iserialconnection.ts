import { Types } from "./";
import { IMeshDevice } from "./imeshdevice";
import type { serialConnectionParameters } from "./types";

/**
 * Allows to connect to a meshtastic device over HTTP(S)
 * @description NOT YET IMPLEMENTED
 */
export class ISerialConnection extends IMeshDevice {
  private port: SerialPort | undefined;

  constructor() {
    super();

    this.port = undefined;
  }

  /**
   */
  public async connect(parameters: serialConnectionParameters): Promise<void> {
    this.port = await navigator.serial.requestPort();
    await this.port.open({
      baudRate: parameters.baudRate ? parameters.baudRate : 921600
    });
  }

  /**
   * Disconnects from the meshtastic device
   */
  public disconnect(): void {
    this.onDeviceStatusEvent.next(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
  }

  /**
   * Pings device to check if it is avaliable
   */
  public async ping(): Promise<boolean> {
    return true;
  }

  /**
   * Short description
   */
  protected async readFromRadio(): Promise<void> {}

  /**
   * Short description
   */
  protected async writeToRadio(ToRadioUInt8Array: Uint8Array): Promise<void> {}
}
