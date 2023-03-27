import { Protobuf } from "../index.js";
import crc16ccitt from "crc/calculators/crc16ccitt";

//if counter > 35 then reset counter/clear/error/reject promise
type XModemProps = (toRadio: Uint8Array, id?: number) => Promise<number>;

export class XModem {
  private sendRaw: XModemProps;
  private rxBuffer: Uint8Array[];
  private txBuffer: Uint8Array[];
  private textEncoder: TextEncoder;
  private counter: number;

  constructor(sendRaw: XModemProps) {
    this.sendRaw = sendRaw;
    this.rxBuffer = [];
    this.txBuffer = [];
    this.textEncoder = new TextEncoder();
    this.counter = 0;
  }

  async downloadFile(filename: string): Promise<number> {
    console.log("XModem - getFile");
    console.log(filename);

    return this.sendCommand(
      Protobuf.XModem_Control.STX,
      this.textEncoder.encode(filename),
      0,
    );
  }

  async uploadFile(filename: string, data: Uint8Array): Promise<number> {
    for (let i = 0; i < data.length; i += 128) {
      this.txBuffer.push(data.slice(i, i + 128));
    }

    return await this.sendCommand(
      Protobuf.XModem_Control.SOH,
      this.textEncoder.encode(filename),
      0,
    );
  }

  async sendCommand(
    command: Protobuf.XModem_Control,
    buffer?: Uint8Array,
    sequence?: number,
    crc16?: number,
  ): Promise<number> {
    const toRadio = new Protobuf.ToRadio({
      payloadVariant: {
        case: "xmodemPacket",
        value: {
          buffer,
          control: command,
          seq: sequence,
          crc16: crc16,
        },
      },
    });
    return this.sendRaw(toRadio.toBinary());
  }

  async handlePacket(packet: Protobuf.XModem): Promise<number> {
    console.log(`${Protobuf.XModem_Control[packet.control]} - ${packet.seq}`);
    await new Promise((resolve) => setTimeout(resolve, 100));

    switch (packet.control) {
      case Protobuf.XModem_Control.NUL:
        // nothing
        break;
      case Protobuf.XModem_Control.SOH:
        this.counter = packet.seq;
        if (this.validateCRC16(packet)) {
          this.rxBuffer[this.counter] = packet.buffer;
          return this.sendCommand(Protobuf.XModem_Control.ACK);
        } else {
          return this.sendCommand(
            Protobuf.XModem_Control.NAK,
            undefined,
            packet.seq,
          );
        }
      case Protobuf.XModem_Control.STX:
        break;
      case Protobuf.XModem_Control.EOT:
        console.log(
          this.rxBuffer.reduce(
            (acc: Uint8Array, curr) => new Uint8Array([...acc, ...curr]),
          ),
        );

        // end of transmission
        break;
      case Protobuf.XModem_Control.ACK:
        this.counter++;
        if (this.txBuffer[this.counter - 1]) {
          return this.sendCommand(
            Protobuf.XModem_Control.SOH,
            this.txBuffer[this.counter - 1],
            this.counter,
            crc16ccitt(this.txBuffer[this.counter - 1] ?? new Uint8Array()),
          );
        } else if (this.counter === this.txBuffer.length + 1) {
          return this.sendCommand(Protobuf.XModem_Control.EOT);
        } else {
          this.clear();
          break;
        }
      case Protobuf.XModem_Control.NAK:
        return this.sendCommand(
          Protobuf.XModem_Control.SOH,
          this.txBuffer[this.counter],
          this.counter,
          crc16ccitt(this.txBuffer[this.counter - 1] ?? new Uint8Array()),
        );
      case Protobuf.XModem_Control.CAN:
        this.clear();
        break;
      case Protobuf.XModem_Control.CTRLZ:
        break;
    }

    return Promise.resolve(0);
  }

  validateCRC16(packet: Protobuf.XModem): boolean {
    return crc16ccitt(packet.buffer) === packet.crc16;
  }

  clear() {
    this.counter = 0;
    this.rxBuffer = [];
    this.txBuffer = [];
  }
}
