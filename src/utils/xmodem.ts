import { Protobuf } from "../index.js";
import crc16 from "crc/calculators/crc16";

type sendRawSignature = (toRadio: Uint8Array, id?: number) => Promise<number>;

export class XModem {
  private sendRaw: sendRawSignature;

  private buffer: Uint8Array;

  private sequence: number;

  // private filename: string = "";

  // private filesize: number = 0;

  // private file: Uint8Array = new Uint8Array(0);

  // private crc16: number = 0;

  // private control: Protobuf.XModem_Control = Protobuf.XModem_Control.NUL;

  // private timeout: number = 0;

  // private textDecoder = new TextDecoder();

  private textEncoder = new TextEncoder();

  constructor(sendRaw: sendRawSignature) {
    this.sendRaw = sendRaw;
    this.buffer = new Uint8Array();
    this.sequence = 0;
  }

  async getFile(filename: string): Promise<number> {
    console.log("XModem - getFile");
    console.log(filename);

    const tmp = await this.sendCommand(
      Protobuf.XModem_Control.STX,
      this.textEncoder.encode(filename),
      0
    );

    return tmp;
  }

  async sendCommand(
    command: Protobuf.XModem_Control,
    buffer: Uint8Array,
    sequence: number
  ): Promise<number> {
    const toRadio = new Protobuf.ToRadio({
      payloadVariant: {
        case: "xmodemPacket",
        value: {
          buffer,
          control: command,
          seq: sequence
        }
      }
    });

    await this.sendRaw(toRadio.toBinary());

    return Promise.resolve(0);
  }

  async handlePacket(packet: Protobuf.XModem): Promise<void> {
    console.log(Protobuf.XModem_Control[packet.control]);

    switch (packet.control) {
      case Protobuf.XModem_Control.NUL:
        //unknown
        break;
      case Protobuf.XModem_Control.SOH:
        if (this.validateCRC16(packet)) {
          console.log("Valid CRC16");

          this.buffer = new Uint8Array([...this.buffer, ...packet.buffer]);
          await this.sendCommand(
            Protobuf.XModem_Control.ACK,
            new Uint8Array(),
            this.sequence
          );
          this.sequence++;
        } else {
          console.log("Invalid CRC16");
          await this.sendCommand(
            Protobuf.XModem_Control.NAK,
            new Uint8Array(),
            this.sequence
          );
        }
        break;
      case Protobuf.XModem_Control.STX:
        // request file
        break;
      case Protobuf.XModem_Control.EOT:
        // complete, emit file
        break;
      case Protobuf.XModem_Control.ACK:
        break;
      case Protobuf.XModem_Control.NAK:
        break;
      case Protobuf.XModem_Control.CAN:
        break;
      case Protobuf.XModem_Control.CTRLZ:
        break;
    }

    return Promise.resolve();
  }

  validateCRC16(packet: Protobuf.XModem): boolean {
    const crc = crc16(packet.buffer);
    // return crc.toString(16) === packet.crc16;
    console.log(
      `Calculated: ${crc.toString(16)}, Received: ${packet.crc16.toString(16)}`
    );
    return true;
  }

  clear() {
    console.log("XModem - clear");
  }
}
