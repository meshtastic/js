import { SimpleEventDispatcher } from "ste-simple-events";
import { MeshDevice } from "../meshDevice.js";
import * as Types from "../types.js";
import { transformHandler } from "../utils/index.js";

/** Allows to connect to a Meshtastic device over WebSerial */
export class SerialConnection extends MeshDevice {
  /** Defines the connection type as serial */
  public connType: Types.ConnectionTypeName;

  protected portId: string;

  /** Serial port used to communicate with device. */
  public port: SerialPort | undefined;

  private readerHack: ReadableStreamDefaultReader<Uint8Array> | undefined;

  /** Transform stream for parsing raw serial data */
  private transformer?: TransformStream<Uint8Array, Uint8Array>;

  /** Should locks be prevented */
  private preventLock?: boolean;

  /** Unfortunately, this is currently the only way to release the lock on a stream after piping it
   *  through a transform stream (https://stackoverflow.com/questions/71262432) */
  private pipePromise?: Promise<void>;

  /**
   * Fires when `disconnect()` is called, used to instruct serial port and
   * readers to release there locks
   *
   * @event onReleaseEvent
   */
  private readonly onReleaseEvent: SimpleEventDispatcher<boolean>;

  constructor(configId?: number) {
    super(configId);

    this.log = this.log.getSubLogger({ name: "SerialConnection" });

    this.connType = "serial";
    this.portId = "";
    this.port = undefined;
    this.transformer = undefined;
    this.onReleaseEvent = new SimpleEventDispatcher<boolean>();
    this.preventLock = false;

    this.log.debug(
      Types.Emitter[Types.Emitter.Constructor],
      "🔷 SerialConnection instantiated",
    );
  }

  /**
   * Reads packets from transformed serial port steam and processes them.
   */
  private async readFromRadio(
    reader: ReadableStreamDefaultReader<Uint8Array>,
  ): Promise<void> {
    this.onReleaseEvent.subscribe(async () => {
      this.preventLock = true;
      await reader.cancel();
      await this.pipePromise?.catch(() => {});
      reader.releaseLock();
      await this.port?.close();
    });

    while (this.port?.readable && !this.preventLock) {
      await reader
        .read()
        .then(({ value }) => {
          if (value) {
            this.handleFromRadio(value);
          }
        })
        .catch(() => {
          this.log.debug(
            Types.Emitter[Types.Emitter.ReadFromRadio],
            "Releasing reader",
          );
        });
    }
  }

  /** Gets list of serial ports that can be passed to `connect` */
  public async getPorts(): Promise<SerialPort[]> {
    return await navigator.serial.getPorts();
  }

  /**
   * Opens browsers connection dialogue to select a serial port
   */
  public async getPort(filter?: SerialPortRequestOptions): Promise<SerialPort> {
    return await navigator.serial.requestPort(filter);
  }

  public getCurrentPort() {
    return this.port;
  }

  /**
   * Initiates the connect process to a Meshtastic device via Web Serial
   */
  public async connect({
    port,
    baudRate = 115200,
    concurrentLogOutput = false,
  }: Types.SerialConnectionParameters): Promise<void> {
    /** Set device state to connecting */
    this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceConnecting);

    /** Set device if specified, else request. */
    this.port = port ?? (await this.getPort());

    // this.portId = this.port. TODO: add once WebSerial adds unique/port identifiers

    /** Setup event listners */
    this.port.addEventListener("disconnect", () => {
      this.log.info(
        Types.Emitter[Types.Emitter.Connect],
        "Device disconnected",
      );
      this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceDisconnected);
      this.complete();
    });

    this.preventLock = false;
    /** Connect to device */
    await this.port
      .open({
        baudRate,
      })
      .then(() => {
        if (this.port?.readable && this.port.writable) {
          this.transformer = transformHandler(
            this.log,
            this.onReleaseEvent,
            this.events.onDeviceDebugLog,
            concurrentLogOutput,
          );

          this.pipePromise = this.port.readable.pipeTo(
            this.transformer.writable,
          );
          this.readerHack = this.transformer.readable.getReader();
          const reader = this.readerHack;
          this.readFromRadio(reader);

          this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceConnected);

          this.configure().catch(() => {
            // TODO: FIX, workaround for `wantConfigId` not getting acks.
          });
        } else {
          console.log("not readable or writable");
        }
      })
      .catch((e: Error) => {
        this.log.error(Types.Emitter[Types.Emitter.Connect], `❌ ${e.message}`);
      });
  }

  /** Disconnects from the serial port */
  public async reconnect(): Promise<void> {
    await this.connect({
      port: this.port,
      concurrentLogOutput: false,
    });
  }

  /** Disconnects from the serial port */
  public async disconnect(): Promise<SerialPort | undefined> {
    // this.onReleaseEvent.dispatch(true);
    // HACK: Inline onReleaseEvent
    // -- This should be used as an event, like intened
    this.preventLock = true;
    await this.readerHack?.cancel();
    await this.pipePromise?.catch(() => {});
    this.readerHack?.releaseLock();
    if (this.port?.readable) {
      await this.port?.close();
    }
    // -------
    this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceDisconnected);
    this.complete();
    // await this.onReleaseEvent.toPromise();
    return this.port;
  }

  /** Pings device to check if it is avaliable */
  public async ping(): Promise<boolean> {
    return await Promise.resolve(true);
  }

  /**
   * Sends supplied protobuf message to the radio
   */
  protected async writeToRadio(data: Uint8Array): Promise<void> {
    while (this.port?.writable?.locked) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const writer = this.port?.writable?.getWriter();

    await writer?.write(
      new Uint8Array([0x94, 0xc3, 0x00, data.length, ...data]),
    );
    writer?.releaseLock();
  }
}
