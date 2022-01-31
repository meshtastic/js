import serialport from 'serialport';

import { Types } from "./index.js";
import { IMeshDevice } from "./iMeshDevice.js";
import type { SerialConnectionParameters } from "./types.js";
import { LogRecord_Level } from "./generated/mesh.js";
import { log } from "./utils/logging.js";
import {
  ReadableStream,
  WritableStream,
  TransformStream,
} from 'node:stream/web';
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
  private reader

  /**
   * Writable stream to serial port.
   */
  private writer: WritableStream<ArrayBuffer>;

  constructor() {
    super();

    this.port = undefined;

    this.reader = new ReadableStream();
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
        log(
          `ISerialConnection.readFromRadio`,
          `Device errored or disconnected: ${error as string}`,
          LogRecord_Level.CRITICAL
        );
        await this.disconnect();

        /**
         * @todo, Handle non-fatal read error.
         */
      }
    }
  }

  /**
   * Gets list of serial ports that can be passed to `connect`
   */
  public async getPorts(): Promise<SerialPort[]> {
    // if (navigator) {
    //   return navigator.serial.getPorts();
    // }
    return serialport.list();
  }

  /**
   * Gets list of serial ports that can be passed to `connect`
   */
  public async getPort(filter?: SerialPortRequestOptions): Promise<SerialPort> {
    // if (navigator) {
    //   return navigator.serial.requestPort(filter);
    // }
    return serialport.list().then (
      ports => ports.forEach(port =>console.log(port.path)),
      err => console.log(err)
    )
  }

  /**
   * Initiates the connect process to a Meshtastic device via Web Serial
   * @param parameters serial connection parameters
   */
  public async connect(parameters: SerialConnectionParameters): Promise<void> {
    this.port = parameters.port ? parameters.port : await this.getPort();

    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTING);
    let myPort = new serialport(this.port.path, this.port.baudRate);
    let Readline = serialport.parsers.Readline; // make instance of Readline parser
    let parser = new Readline(); // make a new parser to read ASCII lines
    myPort.pipe(parser); // pipe the serial stream to the parser
    myPort.on('open', console.log);
    parser.on('data', console.log);
    myPort.on('close', console.log);
    myPort.on('error', console.log);

    let byteBuffer = new Uint8Array([]);

    if (this.port.readable && this.port.writable) {
      const transformer = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk: Uint8Array, controller): void {
          byteBuffer = new Uint8Array([...byteBuffer, ...chunk]);

          if (byteBuffer.includes(0x94)) {
            const index = byteBuffer.findIndex((byte) => byte === 0x94);
            const startBit2 = byteBuffer[index + 1];
            const msb = byteBuffer[index + 2] ?? 0;
            const lsb = byteBuffer[index + 3] ?? 0;

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
