import { Types } from "./index.js";
import { IMeshDevice } from "./iMeshDevice.js";
import { LogRecord_Level } from "./generated/mesh.js";
import { MeshtasticStreamParser } from "./utils/meshtasticStreamParser.js";

import { SerialPort } from "serialport";

/**
 * Allows connection to a Meshtastic device over NodeJS SerialPort
 */
export class INodeSerialConnection extends IMeshDevice {
  /**
   * Defines the connection type as serial
   */
  connType: string;

  /**
   * Serial port used to communicate with device.
   */
  private port: SerialPort | undefined;

  constructor(path: string, configId?: number) {
    super(configId);

    this.connType = "serial";
    this.port = undefined;
    this.port = new SerialPort({
      path: path,
      baudRate: 115200,
      autoOpen: false,
    });

    this.port.pipe(new MeshtasticStreamParser({ defaultEncoding: 'binary' }));
  }

  public static async getPorts(): Promise<INodeSerialPort[]> {
    const portInfos = await SerialPort.list();
    return portInfos.map(p => <INodeSerialPort> { 
      path: p.path, 
      description: p.manufacturer 
    });
  }
  
  /**
   * Reads packets from transformed serial port steam and processes them.
   */
  private async readFromRadio(): Promise<void> {
    if (this.port?.readable) {
      try {
        const buffer = await this.port.read() as Buffer;
        if (buffer && buffer.length > 0) {
          void this.handleFromRadio(new Uint8Array(buffer.buffer));
        }
      } catch (error) {
        this.log(
          Types.EmitterScope.iNodeSerialConnection,
          Types.Emitter.readFromRadio,
          `Device errored or disconnected: ${error as string}`,
          LogRecord_Level.INFO
        );
        await this.disconnect();
      }
    }
  }

  /**
   * Initiates the connect process to a Meshtastic device via Web Serial
   * @param parameters serial connection parameters
   */
  public async connect(): Promise<void> {
    this.port?.on("disconnect", (e) => {
      this.log(
        Types.EmitterScope.iNodeSerialConnection,
        Types.Emitter.connect,
        `Device disconnected: ${e}`,
        LogRecord_Level.INFO
      );
      this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
      this.complete();
    });

    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTING);
    this.port?.open((e) => {
      if (e) {
        this.log(
          Types.EmitterScope.iNodeSerialConnection,
          Types.Emitter.connect,
          `Conn: ${e.message}`,
          LogRecord_Level.ERROR
        );
      }
      else {
        void this.readFromRadio();

        /**
         * @todo, implement device keep-awake loop
         */

        this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTED);

        void this.configure();
      }
    });
  }

  /**
   * Disconnects from the serial port
   */
  public async disconnect(): Promise<void> {
    await Promise.resolve();
    this.port?.close();
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
    while (!this.port?.isOpen) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.port.write(
      new Uint8Array([0x94, 0xc3, 0x00, data.length, ...data]),
      'binary',
      (e: Error | null | undefined) => {
        if (e) {
          this.log(
            Types.EmitterScope.iNodeSerialConnection,
            Types.Emitter.writeToRadio,
            `Conn: ${e.message}`,
            LogRecord_Level.ERROR
          );
        }
      }
    );
  }
}

interface INodeSerialPort {
  path: string,
  description: string,
}
