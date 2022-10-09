import { Protobuf, Types } from "./index.js";
import { IMeshDevice } from "./iMeshDevice.js";

/** Allows to connect to a Meshtastic device over WebSerial */
export class ISerialConnection extends IMeshDevice {
  /** Defines the connection type as serial */
  connType: string;

  /** Serial port used to communicate with device. */
  private port: SerialPort | undefined;

  /** Readable stream from serial port. */
  private reader: ReadableStreamDefaultReader<Uint8Array>;

  /** Writable stream to serial port. */
  private writer: WritableStream<ArrayBuffer>;

  constructor(configId?: number) {
    super(configId);

    this.connType = "serial";
    this.port = undefined;
    this.reader = new ReadableStreamDefaultReader(new ReadableStream());
    this.writer = new WritableStream();
  }

  /** Reads packets from transformed serial port steam and processes them. */
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
            this.reader.releaseLock();
            break;
          }
        }
      } catch (error) {
        this.log(
          Types.EmitterScope.iSerialConnection,
          Types.Emitter.readFromRadio,
          `Device errored or disconnected: ${error as string}`,
          Protobuf.LogRecord_Level.INFO
        );
        await this.disconnect();
      }
    }
  }

  /** Gets list of serial ports that can be passed to `connect` */
  public async getPorts(): Promise<SerialPort[]> {
    return navigator.serial.getPorts();
  }

  /**
   * Opens browsers connection dialogue to select a serial port
   *
   * @param {SerialPortRequestOptions} [filter] Filter to use when requesting
   *   serial port
   * @returns {Promise<SerialPort>} Returned SerialPort
   */
  public async getPort(filter?: SerialPortRequestOptions): Promise<SerialPort> {
    return navigator.serial.requestPort(filter);
  }

  /**
   * Initiates the connect process to a Meshtastic device via Web Serial
   *
   * @param {Types.SerialConnectionParameters} parameters Serial connection
   *   parameters
   * @param {SerialPort} [parameters.port] Externally sourced serialport to
   *   connect to
   * @param {number} [parameters.baudRate=115200] Baud rate override. Default is
   *   `115200`. Default is `115200`
   * @param {boolean} [concurrentLogOutput=false] Emit extra data on serial port
   *   as debug log data. Default is `false`
   */
  public async connect({
    port,
    baudRate = 115200,
    concurrentLogOutput = false
  }: Types.SerialConnectionParameters): Promise<void> {
    /** Check for API avaliability */
    if (!navigator.serial) {
      this.log(
        Types.EmitterScope.iSerialConnection,
        Types.Emitter.connect,
        `⚠️ This browser doesn't support the WebSerial API`,
        Protobuf.LogRecord_Level.WARNING
      );
    }

    /** Set device state to connecting */
    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTING);

    /** Set device if specified, else request. */
    this.port = port ?? (await this.getPort());

    /** Setup event listners */
    this.port.addEventListener("disconnect", () => {
      this.log(
        Types.EmitterScope.iSerialConnection,
        Types.Emitter.connect,
        "Device disconnected",
        Protobuf.LogRecord_Level.INFO
      );
      this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
      this.complete();
    });

    /** Connect to device */
    await this.port.open({
      baudRate
    });

    let byteBuffer = new Uint8Array([]);
    const onDeviceDebugLog = this.onDeviceDebugLog;

    if (this.port.readable && this.port.writable) {
      const { log } = this;
      const transformer = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk: Uint8Array, controller): void {
          byteBuffer = new Uint8Array([...byteBuffer, ...chunk]);
          let processingExhausted = false;
          while (byteBuffer.length !== 0 && !processingExhausted) {
            const framingIndex = byteBuffer.findIndex((byte) => byte === 0x94);
            const framingByte2 = byteBuffer[framingIndex + 1];
            if (framingByte2 === 0xc3) {
              if (byteBuffer.subarray(0, framingIndex).length) {
                if (concurrentLogOutput) {
                  onDeviceDebugLog.emit(byteBuffer.subarray(0, framingIndex));
                } else {
                  log(
                    Types.EmitterScope.iSerialConnection,
                    Types.Emitter.connect,
                    `⚠️ Found unneccesary message padding, removing: ${byteBuffer
                      .subarray(0, framingIndex)
                      .toString()}`,
                    Protobuf.LogRecord_Level.WARNING
                  );
                }

                byteBuffer = byteBuffer.subarray(framingIndex);
              }

              const msb = byteBuffer[2];
              const lsb = byteBuffer[3];

              if (
                msb !== undefined &&
                lsb !== undefined &&
                byteBuffer.length >= 4 + (msb << 8) + lsb
              ) {
                const packet = byteBuffer.subarray(4, 4 + (msb << 8) + lsb);

                const malformedDetectorIndex = packet.findIndex(
                  (byte) => byte === 0x94
                );
                if (
                  malformedDetectorIndex !== -1 &&
                  packet[malformedDetectorIndex + 1] == 0xc3
                ) {
                  log(
                    Types.EmitterScope.iSerialConnection,
                    Types.Emitter.connect,
                    `⚠️ Malformed packet found, discarding: ${byteBuffer
                      .subarray(0, malformedDetectorIndex - 1)
                      .toString()}`,
                    Protobuf.LogRecord_Level.WARNING
                  );

                  byteBuffer = byteBuffer.subarray(malformedDetectorIndex);
                } else {
                  byteBuffer = byteBuffer.subarray(3 + (msb << 8) + lsb + 1);
                  controller.enqueue(packet);
                }
              } else {
                /** Only partioal message in buffer, wait for the rest */
                processingExhausted = true;
              }
            } else {
              /** Message not complete, only 1 byte in buffer */
              processingExhausted = true;
            }
          }
        }
      });
      this.reader = this.port.readable.pipeThrough(transformer).getReader();

      this.writer = this.port.writable;
    } else {
      console.log("not readable or writable");
    }

    void this.readFromRadio();

    /** TODO: implement device keep-awake loop */

    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTED);

    this.configure();
  }

  /** Disconnects from the serial port */
  public async disconnect(): Promise<void> {
    await this.reader.cancel();
    await this.port?.close();
    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
    this.complete();
  }

  /** Pings device to check if it is avaliable */
  public async ping(): Promise<boolean> {
    return Promise.resolve(true);
  }

  /**
   * Sends supplied protobuf message to the radio
   *
   * @param {Uint8Array} data Raw bytes to send
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
