import { Protobuf } from "../index.js";
type XModemProps = (toRadio: Uint8Array, id?: number) => Promise<number>;
export declare class XModem {
    private sendRaw;
    private rxBuffer;
    private txBuffer;
    private textEncoder;
    private counter;
    constructor(sendRaw: XModemProps);
    downloadFile(filename: string): Promise<number>;
    uploadFile(filename: string, data: Uint8Array): Promise<number>;
    sendCommand(command: Protobuf.XModem_Control, buffer?: Uint8Array, sequence?: number, crc16?: number): Promise<number>;
    handlePacket(packet: Protobuf.XModem): Promise<number>;
    validateCRC16(packet: Protobuf.XModem): boolean;
    clear(): void;
}
export {};
