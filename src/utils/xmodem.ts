import { Protobuf } from "../index.js";
import crc16ccitt from "crc/calculators/crc16ccitt";

type sendRawSignature = (toRadio: Uint8Array, id?: number) => Promise<number>;

export class XModem {
  private sendRaw: sendRawSignature;

  private buffer: Uint8Array;

  private maxFileSize: number;

  private textEncoder = new TextEncoder();

  constructor(sendRaw: sendRawSignature) {
    this.sendRaw = sendRaw;
    this.buffer = new Uint8Array();
    this.maxFileSize = 2 ^ 5;
  }

  async downloadFile(filename: string): Promise<number> {
    console.log("XModem - getFile");
    console.log(filename);

    return this.sendCommand(
      Protobuf.XModem_Control.STX,
      this.textEncoder.encode(filename),
      0
    );
  }

  async uploadFile(filename: string, data: Uint8Array): Promise<number> {
    return this.sendCommand(
      Protobuf.XModem_Control.SOH,
      data,
      0,
      crc16ccitt(data)
    );
  }

  async sendCommand(
    command: Protobuf.XModem_Control,
    buffer?: Uint8Array,
    sequence?: number,
    crc16?: number
  ): Promise<number> {
    const toRadio = new Protobuf.ToRadio({
      payloadVariant: {
        case: "xmodemPacket",
        value: {
          buffer,
          control: command,
          seq: sequence,
          crc16: crc16
        }
      }
    });

    return this.sendRaw(toRadio.toBinary());
  }

  async handlePacket(packet: Protobuf.XModem): Promise<number> {
    console.log(Protobuf.XModem_Control[packet.control]);

    switch (packet.control) {
      case Protobuf.XModem_Control.NUL:
        // nothing
        break;
      case Protobuf.XModem_Control.SOH:
        // start of header
        if (this.validateCRC16(packet)) {
          this.buffer = new Uint8Array([...this.buffer, ...packet.buffer]);
          await new Promise((resolve) => setTimeout(resolve, 100));
          return this.sendCommand(Protobuf.XModem_Control.ACK);
        } else {
          console.log("Invalid CRC16");
          return this.sendCommand(
            Protobuf.XModem_Control.NAK,
            undefined,
            packet.seq
          );
        }
      case Protobuf.XModem_Control.STX:
        // start of transmission
        break;
      case Protobuf.XModem_Control.EOT:
        // end of transmission
        break;
      case Protobuf.XModem_Control.ACK:
        // next packet
        break;
      case Protobuf.XModem_Control.NAK:
        // resend
        break;
      case Protobuf.XModem_Control.CAN:
        // cancel
        this.clear();
        break;
      case Protobuf.XModem_Control.CTRLZ:
        // end of file
        break;
    }

    return Promise.resolve(0);
  }

  validateCRC16(packet: Protobuf.XModem): boolean {
    return crc16ccitt(packet.buffer) === packet.crc16;
  }

  clear() {
    this.buffer = new Uint8Array();
  }
}
