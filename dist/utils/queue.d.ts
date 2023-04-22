import { PacketError } from "../types.js";
export interface IQueueItem {
    id: number;
    data: Uint8Array;
    sent: boolean;
    promise: Promise<number>;
}
export declare class Queue {
    private queue;
    private lock;
    private ackNotifier;
    private errorNotifier;
    private timeout;
    constructor();
    clear(): void;
    push(item: Omit<IQueueItem, "promise" | "sent">): void;
    remove(id: number): void;
    processAck(id: number): void;
    processError(e: PacketError): void;
    wait(id: number): Promise<number>;
    processQueue(writeToRadio: (data: Uint8Array) => Promise<void>): Promise<void>;
}
