import { SimpleEventDispatcher } from "ste-simple-events";
import { MeshDevice } from "../meshDevice.js";
import * as Types from "../types.js";
import * as SerialPort from "serialport";
import { nodeTransformHandler } from "../utils/index.js";

export class NodeSerialConnection extends MeshDevice {
  /** Defines the connection type as serial */
  public connType: Types.ConnectionTypeName;

  protected portId: string;

  /** Serial port used to communicate with device. */
  public port: any | undefined;

  private portPath: string | undefined;

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
    this.portPath = undefined;
    this.onReleaseEvent = new SimpleEventDispatcher<boolean>();

    this.log.debug(
      Types.Emitter[Types.Emitter.Constructor],
      "🔷 SerialConnection instantiated",
    );
  }

  /**
   * Reads packets from transformed serial port steam and processes them.
   */
  private async readFromRadio( concurrentLogOutput: boolean): Promise<void> {
    this.onReleaseEvent.subscribe(async () => {
      console.log('released?');
    });

    const transformedStream = this.port.pipe(
      nodeTransformHandler(
        this.log,
        this.onReleaseEvent,
        this.events.onDeviceDebugLog,
        concurrentLogOutput
      ));

    transformedStream.on('data', (data: Buffer) => {
      this.handleFromRadio(data);
    })
    /*
    transformedStream.on('finish', () => {
      let chunk;
      while (null !== (chunk = transformedStream.read()))
      this.handleFromRadio(chunk);
    })
      */
    transformedStream.on('error', (err: any) => {
      console.log(err);
    })
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

  public async connect({
    portPath,
    baudRate = 115200,
    concurrentLogOutput = false
  }: Types.NodeSerialConnectionParameters) {
    this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceConnecting);

    this.portPath = portPath;
    this.port = new SerialPort.SerialPort({
      path: portPath,
      baudRate,
    }, () => {
      console.log('Port opened');

      if (this.port.readable && this.port.writable) {
        this.readFromRadio(concurrentLogOutput);
        
        this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceConnected);
      } else {
        console.log("not readable or writable");
      }
    });

    /*
    const openPort = async () => {
      this.port.open(() => {
        Promise.resolve();
      });
    };

    this.port.on('open', () => {
      console.log('Port opened');
    })

    await openPort().then(() => {
        if (this.port.readable && this.port.writable) {
          console.log(115);
          this.readFromRadio(concurrentLogOutput);
          
          this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceConnected);
        } else {
          console.log("not readable or writable");
        }
      }).catch((e: Error) => {
        this.log.error(Types.Emitter[Types.Emitter.Connect], `❌ ${e.message}`);
      });
    */
    this.port.on('close', () => {
      this.log.info(
        Types.Emitter[20 /* Connect */],
        'Device disconnected'
      );
      this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceDisconnected);
      this.complete();
    });

    this.port.on('error', (err: any) => {
      console.log(err);
    });

  }
  /** Disconnects from the serial port */
  public async reconnect(): Promise<void> {
    await this.connect({
      portPath: this.portPath ?? '',
      concurrentLogOutput: false,
    });
  }

  /** Disconnects from the serial port */
  public async disconnect(): Promise<SerialPort | undefined> {
    // this.onReleaseEvent.dispatch(true);
    // HACK: Inline onReleaseEvent
    // -- This should be used as an event, like intened
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
    const write = (data: Uint8Array): Promise<void> => {
      return new Promise((resolve) => {
      this.port.write(data, () => {
        resolve();
      })
      });
    };

    await write(
      new Uint8Array([0x94, 0xc3, 0x00, data.length, ...data]),
    );
  }
}