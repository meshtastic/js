import { Types } from "./index.js";
import { IMeshDevice } from "./iMeshDevice.js";
import type { SerialConnectionParameters } from "./types.js";
import { LogRecord_Level } from "./generated/mesh.js";
import { transformHandler } from "./utils/transformHandler.js";

/**
 * Allows to connect to a Meshtastic device over WebSerial
 */
export class ISerialConnection extends IMeshDevice {
  /**
   * Defines the connection type as serial
   */
  connType: string;

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

  constructor(configId?: number) {
    super(configId);

    this.connType = "serial";
    this.port = undefined;
    this.reader = new ReadableStreamDefaultReader(new ReadableStream());
    this.writer = new WritableStream();
  }

  /**
   * Reads packets from transformed serial port steam and processes them.
   */
  private async readFromRadio(): Promise<void> {
    while (this.port?.readable) {
      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done } = await this.reader.read();
          if (value) {
            void this.handleFromRadio(value);
          }

          if (done) {
            console.log("done");

            this.reader.releaseLock();
            break;
          }
        }
      } catch (error) {
        this.log(
          Types.EmitterScope.iSerialConnection,
          Types.Emitter.readFromRadio,
          `Device errored or disconnected: ${error as string}`,
          LogRecord_Level.INFO
        );
        await this.disconnect();
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
   * Opens browsers connection dialogue to select a serial port
   */
  public async getPort(filter?: SerialPortRequestOptions): Promise<SerialPort> {
    return navigator.serial.requestPort(filter);
  }

  /**
   * Initiates the connect process to a Meshtastic device via Web Serial
   * @param parameters serial connection parameters
   */
  public async connect({
    port,
    baudRate
  }: SerialConnectionParameters): Promise<void> {
    /**
     * Check for API avaliability
     */
    if (!navigator.serial) {
      this.log(
        Types.EmitterScope.iSerialConnection,
        Types.Emitter.connect,
        `This browser doesn't support the WebSerial API`,
        LogRecord_Level.WARNING
      );
    }

    /**
     * Set device state to connecting
     */
    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTING);

    /**
     * Set device if specified, else request.
     */
    this.port = port ?? (await this.getPort());

    /**
     * Setup event listners
     */
    this.port.addEventListener("disconnect", () => {
      this.log(
        Types.EmitterScope.iSerialConnection,
        Types.Emitter.connect,
        "Device disconnected",
        LogRecord_Level.INFO
      );
      this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
      this.complete();
    });

    /**
     * Connect to device
     */
    await this.port.open({
      baudRate: baudRate ?? 115200
    });

    if (this.port.readable && this.port.writable) {
      const transformer = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk: Uint8Array, controller): void {
          transformHandler(new Uint8Array([]), chunk, (buffer) => {
            controller.enqueue(buffer);
          });
        }
      });
      this.reader = this.port.readable.pipeThrough(transformer).getReader();

      this.writer = this.port.writable;
    }

    void this.readFromRadio();

    /**
     * @todo, implement device keep-awake loop
     */

    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTED);

    await this.configure();
  }

  /**
   * Disconnects from the serial port
   */
  public async disconnect(): Promise<void> {
    await this.reader.cancel();
    await this.port?.close();
    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
    this.complete();
  }

  /**
   * Pings device to check if it is avaliable
   */
  public async ping(): Promise<boolean> {
    return Promise.resolve(true);
  }

  /**
   * Sends supplied protobuf message to the radio
   */
  protected async writeToRadio(data: Uint8Array): Promise<void> {
    while (this.writer.locked) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const writer = this.writer.getWriter();

    await writer.write(
      new Uint8Array([0x94, 0xc3, 0x00, data.length, ...data])
    );
    writer.releaseLock();
  }
}
