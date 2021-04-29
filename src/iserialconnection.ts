import { Types } from "./";
import { IMeshDevice } from "./imeshdevice";
import type { serialConnectionParameters } from "./types";

/**
 * Allows to connect to a meshtastic device over WebSerial
 */
export class ISerialConnection extends IMeshDevice {
  /**
   *
   */
  private port: SerialPort | undefined;

  /**
   *
   */
  private reader: ReadableStreamDefaultReader<Uint8Array>;

  /**
   *
   */
  private writer: WritableStream<ArrayBuffer>;

  constructor() {
    super();

    this.port = undefined;

    this.reader = new ReadableStreamDefaultReader(new ReadableStream());
    this.writer = new WritableStream();
  }

  private async readLoop() {
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

  public async connect(parameters: serialConnectionParameters): Promise<void> {
    this.port = await navigator.serial.requestPort();

    await this.port.open({
      baudRate: parameters.baudRate ? parameters.baudRate : 921600
    });

    let byteBuffer = new Uint8Array([]);

    if (this.port.readable && this.port.writable) {
      this.reader = this.port.readable
        .pipeThrough(
          new TransformStream({
            start(controller) {
              controller.enqueue(byteBuffer);
            },
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
            },
            flush(transformer) {
              transformer.enqueue(byteBuffer);
            }
          })
        )
        .getReader();

      this.writer = this.port.writable;
    }

    this.readLoop();

    await this.configure();
  }

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
  protected async writeToRadio(data: Uint8Array): Promise<void> {
    const writer = this.writer.getWriter();
    writer.write(new Uint8Array([0x94, 0xc3, 0x00, data.length, ...data]));
    writer.releaseLock();
  }
}
