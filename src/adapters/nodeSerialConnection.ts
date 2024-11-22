import * as SerialPort from "serialport";
import { SimpleEventDispatcher } from "ste-simple-events";
import { MeshDevice } from "../meshDevice.js";
import * as Types from "../types.js";
import { nodeTransformHandler } from "../utils/index.js";

export class NodeSerialConnection extends MeshDevice {
  /** Defines the connection type as serial */
  public connType: Types.ConnectionTypeName;

  protected portId: string;

  /** Serial port used to communicate with device. */
  public port: SerialPort.SerialPort | undefined;

  /**Path to the serial port being opened. */
  private portPath: string | undefined;

  /* Reference for the heartbeat ping interval so it can be canceled on disconnect. */ 
  private heartbeatInterval?: ReturnType<typeof setInterval> | undefined;

  /**
   * Fires when `disconnect()` is called, used to instruct serial port and
   * readers to release their locks
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
    this.portPath = undefined;
    this.onReleaseEvent = new SimpleEventDispatcher<boolean>();

    this.log.debug(
      Types.Emitter[Types.Emitter.Constructor],
      "🔷 SerialConnection instantiated",
    );
  }

  /**
   * Reads packets from transformed serial port stream and processes them.
   */
  private async readFromRadio(concurrentLogOutput: boolean): Promise<void> {
    // Put the data received from the serial connection through the transformer
    const transformedStream = this.port?.pipe(
      nodeTransformHandler(
        this.log,
        this.onReleaseEvent,
        this.events.onDeviceDebugLog,
        concurrentLogOutput,
      ),
    );

    // Consume the transformed data
    transformedStream?.on("data", (data: Buffer) => {
      this.handleFromRadio(data);
    });

    transformedStream?.on("error", (err: Error) => {
      console.log(err);
    });
  }

  /** Gets list of serial ports that can be passed to `connect` as `portPath` */
  // biome-ignore lint/suspicious/noExplicitAny: serialport/binding-interface
  public async getPorts(): Promise<any[]> {
    return SerialPort.SerialPort.list();
  }

  /**
   * Initiates the connect process to a Meshtastic device via NodeJS Serial
   */
  public async connect({
    portPath,
    baudRate = 115200,
    concurrentLogOutput = false,
  }: Types.NodeSerialConnectionParameters) {
    this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceConnecting);

    this.portPath = portPath;
    this.port = new SerialPort.SerialPort(
      {
        path: portPath,
        baudRate,
      },
      () => {
        if (this.port?.readable && this.port?.writable) {
          this.readFromRadio(concurrentLogOutput);

          this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceConnected);

          this.configure().catch(() => {
            // TODO: FIX, workaround for `wantConfigId` not getting acks.
          });

          // Set up an interval to send a heartbeat ping once every minute.
          // The firmware requires at least one ping per 15 minutes, so this should be more than enough.
          this.heartbeatInterval = setInterval(() => {
            this.heartbeat().catch((err) => {
              console.error('Heartbeat error', err);
            });
          }, 60*1000);

        } else {
          console.log("not readable or writable");
        }
      },
    );

    this.port.on("close", () => {
      this.log.info(Types.Emitter[20 /* Connect */], "Device disconnected");
      this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceDisconnected);
      this.complete();
    });

    this.port.on("error", (err: Error) => {
      console.log(err);
    });
  }
  /** Disconnects from the serial port */
  public async reconnect(): Promise<void> {
    await this.connect({
      portPath: this.portPath ?? "",
      concurrentLogOutput: false,
    });
  }

  /** Disconnects from the serial port */
  public async disconnect(): Promise<SerialPort.SerialPort | undefined> {
    // this.onReleaseEvent.dispatch(true);
    // HACK: Inline onReleaseEvent
    // -- This should be used as an event, like intened
    if (this.port?.readable) {
      await this.port?.close();
    }
   
    // stop the interval when disconnecting.
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    // -------
    this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceDisconnected);
    this.complete();
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
    const write = (data: Uint8Array): Promise<void> => {
      return new Promise((resolve, reject) => {
        this.port?.write(data, (err: Error | null | undefined): void => {
          if (err) {
            reject(err);
          }
          resolve();
        });
      });
    };

    await write(new Uint8Array([0x94, 0xc3, 0x00, data.length, ...data])).catch(
      (err) => {
        console.log(err);
      },
    );
  }
}
