import { SubEvent } from "sub-events";

import { Protobuf, Types } from "./index.js";
import { IMeshDevice } from "./iMeshDevice.js";
import { transformHandler } from "./utils/transformHandler.js";

/** Allows to connect to a Meshtastic device over WebSerial */
export class ISerialConnection extends IMeshDevice {
  /** Defines the connection type as serial */
  connType: string;

  /** Serial port used to communicate with device. */
  private port: SerialPort | undefined;

  /** Transform stream for parsing raw serial data */
  private transformer?: TransformStream<Uint8Array, Uint8Array>;

  /** Should locks be prevented */
  private preventLock?: boolean;

  /**
   * Fires when `disconnect()` is called, used to instruct serial port and
   * readers to release there locks
   *
   * @event onReleaseEvent
   */
  private readonly onReleaseEvent: SubEvent<boolean>;

  constructor(configId?: number) {
    super(configId);

    this.connType = "serial";
    this.port = undefined;
    this.transformer = undefined;
    this.onReleaseEvent = new SubEvent<boolean>();
    this.preventLock = false;
  }

  /**
   * Reads packets from transformed serial port steam and processes them.
   *
   * @param {ReadableStreamDefaultReader<Uint8Array>} reader Reader to use
   */
  private async readFromRadio(
    reader: ReadableStreamDefaultReader<Uint8Array>
  ): Promise<void> {
    this.onReleaseEvent.subscribe(async () => {
      this.preventLock = true;
      await reader.cancel();
      reader.releaseLock();

      await this.port?.close();
    });

    while (this.port?.readable && !this.preventLock) {
      await reader
        .read()
        .then(({ value }) => {
          if (value) {
            void this.handleFromRadio(value).catch((e: Error) => {
              this.log(
                Types.EmitterScope.iSerialConnection,
                Types.Emitter.readFromRadio,
                `Device errored or disconnected: ${e.message}`,
                Protobuf.LogRecord_Level.INFO
              );
            });
          }
        })
        .catch(() => {
          this.log(
            Types.EmitterScope.iSerialConnection,
            Types.Emitter.readFromRadio,
            `Releasing reader`,
            Protobuf.LogRecord_Level.DEBUG
          );
        });
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
   * @param {boolean} [parameters.concurrentLogOutput=false] Emit extra data on
   *   serial port as debug log data. Default is `false`
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
    await this.port
      .open({
        baudRate
      })
      .then(() => {
        if (this.port?.readable && this.port.writable) {
          this.transformer = transformHandler(
            this.log,
            this.onReleaseEvent,
            this.onDeviceDebugLog,
            concurrentLogOutput
          );

          const reader = this.port.readable.pipeThrough(this.transformer);

          void this.readFromRadio(reader.getReader());

          this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTED);

          this.configure();
        } else {
          console.log("not readable or writable");
        }
      })
      .catch((e: Error) => {
        this.log(
          Types.EmitterScope.iSerialConnection,
          Types.Emitter.connect,
          `❌ ${e.message}`,
          Protobuf.LogRecord_Level.ERROR
        );
      });
  }

  /** Disconnects from the serial port */
  public async reconnect(): Promise<void> {
    await this.connect({
      port: this.port,
      concurrentLogOutput: false
    });
  }

  /** Disconnects from the serial port */
  public async disconnect(): Promise<void> {
    this.onReleaseEvent.emit(true);
    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
    this.complete();
    return Promise.resolve();
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
    while (this.port?.writable?.locked) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const writer = this.port?.writable?.getWriter();

    await writer?.write(
      new Uint8Array([0x94, 0xc3, 0x00, data.length, ...data])
    );
    writer?.releaseLock();
  }
}
