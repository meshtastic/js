import { Protobuf } from "../index.js";
import crc16ccitt from "crc/calculators/crc16ccitt";
export class XModem {
    sendRaw;
    rxBuffer;
    txBuffer;
    textEncoder;
    counter;
    constructor(sendRaw) {
        this.sendRaw = sendRaw;
        this.rxBuffer = [];
        this.txBuffer = [];
        this.textEncoder = new TextEncoder();
        this.counter = 0;
    }
    async downloadFile(filename) {
        console.log("XModem - getFile");
        console.log(filename);
        return this.sendCommand(Protobuf.XModem_Control.STX, this.textEncoder.encode(filename), 0);
    }
    async uploadFile(filename, data) {
        for (let i = 0; i < data.length; i += 128) {
            this.txBuffer.push(data.slice(i, i + 128));
        }
        return await this.sendCommand(Protobuf.XModem_Control.SOH, this.textEncoder.encode(filename), 0);
    }
    async sendCommand(command, buffer, sequence, crc16) {
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
    async handlePacket(packet) {
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
                }
                else {
                    return this.sendCommand(Protobuf.XModem_Control.NAK, undefined, packet.seq);
                }
            case Protobuf.XModem_Control.STX:
                break;
            case Protobuf.XModem_Control.EOT:
                console.log(this.rxBuffer.reduce((acc, curr) => new Uint8Array([...acc, ...curr])));
                // end of transmission
                break;
            case Protobuf.XModem_Control.ACK:
                this.counter++;
                if (this.txBuffer[this.counter - 1]) {
                    return this.sendCommand(Protobuf.XModem_Control.SOH, this.txBuffer[this.counter - 1], this.counter, crc16ccitt(this.txBuffer[this.counter - 1] ?? new Uint8Array()));
                }
                else if (this.counter === this.txBuffer.length + 1) {
                    return this.sendCommand(Protobuf.XModem_Control.EOT);
                }
                else {
                    this.clear();
                    break;
                }
            case Protobuf.XModem_Control.NAK:
                return this.sendCommand(Protobuf.XModem_Control.SOH, this.txBuffer[this.counter], this.counter, crc16ccitt(this.txBuffer[this.counter - 1] ?? new Uint8Array()));
            case Protobuf.XModem_Control.CAN:
                this.clear();
                break;
            case Protobuf.XModem_Control.CTRLZ:
                break;
        }
        return Promise.resolve(0);
    }
    validateCRC16(packet) {
        return crc16ccitt(packet.buffer) === packet.crc16;
    }
    clear() {
        this.counter = 0;
        this.rxBuffer = [];
        this.txBuffer = [];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieG1vZGVtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL3htb2RlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3ZDLE9BQU8sVUFBVSxNQUFNLDRCQUE0QixDQUFDO0FBS3BELE1BQU0sT0FBTyxNQUFNO0lBQ1QsT0FBTyxDQUFjO0lBQ3JCLFFBQVEsQ0FBZTtJQUN2QixRQUFRLENBQWU7SUFDdkIsV0FBVyxDQUFjO0lBQ3pCLE9BQU8sQ0FBUztJQUV4QixZQUFZLE9BQW9CO1FBQzlCLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO1FBQ25CLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO1FBQ25CLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUNyQyxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQztJQUNuQixDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVksQ0FBQyxRQUFnQjtRQUNqQyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUV0QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQ3JCLFFBQVEsQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUMzQixJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFDakMsQ0FBQyxDQUNGLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxRQUFnQixFQUFFLElBQWdCO1FBQ2pELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxHQUFHLEVBQUU7WUFDekMsSUFBSSxDQUFDLFFBQVEs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