// @deno-types="npm:@types/w3c-web-serial"

import { Utils } from "@meshtastic/core";
import type { Types } from "@meshtastic/core";

export class TransportWebSerial implements Types.Transport {
  private _toDevice: WritableStream<Uint8Array>;
  private _fromDevice: ReadableStream<Types.DeviceOutput>;

  public static async create(): Promise<TransportWebSerial> {
    const connection = await navigator.serial.requestPort();
    return new TransportWebSerial(connection);
  }

  constructor(connection: SerialPort) {
    Utils.toDeviceStream.readable.pipeTo(connection.writable);

    if (!connection.readable) {
      throw new Error("No readable stream available");
    }

    this._toDevice = Utils.toDeviceStream.writable;
    this._fromDevice = connection.readable.pipeThrough(
      Utils.fromDeviceStream(),
    );
  }

  get toDevice(): WritableStream<Uint8Array> {
    return this._toDevice;
  }

  get fromDevice(): ReadableStream<Types.DeviceOutput> {
    return this._fromDevice;
  }
}
