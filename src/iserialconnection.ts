import { Types } from "./";
import { IMeshDevice } from "./imeshdevice";
import type { SerialConnectionParameters } from "./types";

/**
 * Allows to connect to a Meshtastic device over WebSerial
 */
export class ISerialConnection extends IMeshDevice {
  /**
   * Serial port used to communicate with device.
   */
  private port: SerialPort | undefined;

  /**
   * Readable stream from serial port.
   */
  private reader: ReadableStreamDefaultReader<Uint8Array>;

  /**
   * Writable stream to serial port.
   */
  private writer: WritableStream<ArrayBuffer>;

  constructor() {
    super();

    this.port = undefined;

    this.reader = new ReadableStreamDefaultReader(new ReadableStream());
    this.writer = new WritableStream();
  }

  /**
   * Reads packets from transformed serial port steam and processes them.
   */
  private async readFromRadio() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { value, done } = await this.reader.read();
      if (value) {
        this.handleFromRadio(value);
      }

      if (done) {
        this.reader.releaseLock();
        break;
      }
    }
  }

  /**
   * Gets list of serial ports that can be passed to `connect`
   */
  public async getPorts(): Promise<SerialPort[]> {
    return navigator.serial.getPorts();
  }

  /**
   * Initiates the connect process to a Meshtastic device via Web Serial
   * @param parameters serial connection parameters
   */
  public async connect(parameters: SerialConnectionParameters): Promise<void> {
    this.port = parameters.port
      ? parameters.port
      : await navigator.serial.requestPort();

    await this.port.open({
      baudRate: parameters.baudRate ?? 921600
    });

    let byteBuffer = new Uint8Array([]);

    if (this.port.readable && this.port.writable) {
      this.reader = this.port.readable
        .pipeThrough(
          new TransformStream({
            transform(chunk: Uint8Array, controller) {
              byteBuffer = new Uint8Array([...byteBuffer, ...chunk]);

              if (byteBuffer.includes(0x94)) {
                const index = byteBuffer.findIndex((byte) => byte === 0x94);
                const startBit2 = byteBuffer[index + 1];
                const msb = byteBuffer[index + 2];
                const lsb = byteBuffer[index + 3];

                if (
                  startBit2 === 0xc3 &&
                  byteBuffer.length >= index + 4 + lsb + msb
                ) {
                  controller.enqueue(
                    byteBuffer.subarray(index + 4, index + 4 + lsb + msb)
                  );
                  byteBuffer = byteBuffer.slice(index + 4 + lsb + msb);
                }
              }
            }
          })
        )
        .getReader();

      this.writer = this.port.writable;
    }

    this.readFromRadio();

    /**
     * @todo, implement device keep-awake loop
     */

    await this.configure();
  }

  /**
   * Disconnects from the serial port
   */
  public disconnect(): void {
    this.port?.close();
    this.onDeviceStatusEvent.next(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
    this.complete();
  }

  /**
   * Pings device to check if it is avaliable
   */
  public async ping(): Promise<boolean> {
    return true;
  }

  /**
   * Sends supplied protobuf message to the radio
   */
  protected async writeToRadio(data: Uint8Array): Promise<void> {
    const writer = this.writer.getWriter();

    writer.write(new Uint8Array([0x94, 0xc3, 0x00, data.length, ...data]));
    writer.releaseLock();
  }
}
