import { Types } from "./";
import { IMeshDevice } from "./imeshdevice";
import type { serialConnectionParameters } from "./types";

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

  /**
   * Connection state of the serial port
   */
  private portOpen: boolean;

  constructor() {
    super();

    this.port = undefined;

    this.reader = new ReadableStreamDefaultReader(new ReadableStream());
    this.writer = new WritableStream();

    this.portOpen = false;
  }

  /**
   * Reads packets from transformed serial port steam and processes them.
   */
  private async readLoop() {
    while (this.portOpen) {
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
   * Gets list of bluetooth devices that can be passed to `connect`
   */
  public async getPorts(): Promise<SerialPort[]> {
    return await navigator.serial.getPorts();
  }

  /**
   * Initiates the connect process to a Meshtastic device via Web Serial
   * @param parameters serial connection parameters
   */
  public async connect(parameters: serialConnectionParameters): Promise<void> {
    this.port = parameters.port
      ? parameters.port
      : await navigator.serial.requestPort();

    await this.port.open({
      baudRate: parameters.baudRate ? parameters.baudRate : 921600
    });
    this.port.addEventListener("connect", () => {
      this.portOpen = true;
    });
    this.port.addEventListener("disconnect", () => {
      this.portOpen = false;
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

                if (
                  startBit2 === 0xc3 &&
                  byteBuffer.length >= index + 4 + msb
                ) {
                  controller.enqueue(
                    byteBuffer.subarray(index + 4, index + 4 + msb)
                  );
                  byteBuffer = byteBuffer.slice(index + 4 + msb);
                }
              }
            }
          })
        )
        .getReader();

      this.writer = this.port.writable;
    }

    this.readLoop();

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
  }

  /**
   * Pings device to check if it is avaliable
   */
  public async ping(): Promise<boolean> {
    return true;
  }

  /**
   * Not used by serial connections, logic handled internally by `ISerialConnection.readLoop()`
   */
  protected async readFromRadio(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Sends supplied protobuf message to the radio
   */
  protected async writeToRadio(data: Uint8Array): Promise<void> {
    console.log(this.writer.locked);
    const writer = this.writer.getWriter();

    writer.write(new Uint8Array([0x94, 0xc3, 0x00, data.length, ...data]));
    writer.releaseLock();
  }
}
