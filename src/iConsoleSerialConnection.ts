/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Types } from "./index.js";
import { IMeshDevice } from "./iMeshDevice.js";
import { LogRecord_Level } from "./generated/mesh.js";

import { SerialPortStream, StreamOptions } from '@serialport/stream';
import { SerialPort } from 'serialport';

/**
 * Allows to connect to a Meshtastic device over WebSerial
 */
export class IConsolSerialConnection extends IMeshDevice {
  /**
   * Defines the connection type as serial
   */
  connType: string;

  /**
   * Serial port used to communicate with device.
   */
  private port: SerialPort | undefined;

  constructor(configId?: number) {
    super(configId);

    this.connType = "serial";
    this.port = undefined;
    this.port = new SerialPort({
      path: 'COM6',
      baudRate: 115200,
      autoOpen: false,
      lock
    });
  }

  /**
   * Reads packets from transformed serial port steam and processes them.
   */
  private async readFromRadio(): Promise<void> {
    while (this.port?.readable) {
      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done } = await this.port?.read();
          if (value) {
            void this.handleFromRadio(value);
          }

          if (done) {
            console.log("done");
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
   * Initiates the connect process to a Meshtastic device via Web Serial
   * @param parameters serial connection parameters
   */
  public async connect(): Promise<void> {
    this.port?.on("disconnect", (e) => {
      this.log(
        Types.EmitterScope.iSerialConnection,
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
          Types.EmitterScope.iSerialConnection,
          Types.Emitter.connect,
          `Conn: ${e.message}`,
          LogRecord_Level.ERROR
        );
      }
    });

    let byteBuffer = new Uint8Array([]);

    if (this.port?.isOpen && this.port.writable) {
      const transformer = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk: Uint8Array, controller): void {
          byteBuffer = new Uint8Array([...byteBuffer, ...chunk]);

          if (byteBuffer.includes(0x94)) {
            const index = byteBuffer.findIndex((byte) => byte === 0x94);
            const startBit2 = byteBuffer[index + 1];
            const msb = byteBuffer[index + 2] ?? 0;
            const lsb = byteBuffer[index + 3] ?? 0;

            const len = index + 4 + lsb + msb;

            if (startBit2 === 0xc3 && byteBuffer.length >= len) {
              controller.enqueue(byteBuffer.subarray(index + 4, len));
              byteBuffer = byteBuffer.slice(len);
            }
          }
        }
      });
      this.port.get.pipeThrough(transformer).getReader();
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
      (e) => {
        this.log(
          Types.EmitterScope.iConsoleSerialConnection,
          Types.Emitter.writeToRadio,
          `Conn: ${e}`,
          LogRecord_Level.ERROR
        );
      }
    );
  }
}
