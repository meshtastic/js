import { SubEvent } from "sub-events";
import { Protobuf } from "../index.js";

export interface IQueueItem {
  id: number;
  data: Uint8Array;
  waitingAck: boolean;
  promise: Promise<number>;
}

export interface packetError {
  id: number;
  error: Protobuf.Routing_Error;
}

export class Queue {
  private queue: IQueueItem[] = [];
  private locked = false;
  private ackNotifier = new SubEvent<number>();
  private errorNotifier = new SubEvent<packetError>();

  public clear(): void {
    this.queue = [];
  }

  public push(item: Omit<IQueueItem, "promise">): void {
    const queueItem = {
      ...item,
      promise: new Promise<number>((resolve, reject) => {
        this.ackNotifier.subscribe((id) => {
          resolve(id);
          if (item.id === id) {
            resolve(id);
            this.remove(item.id);
          }
        });
        this.errorNotifier.subscribe((e) => {
          reject(e);
          if (item.id === e.id) {
            reject(e);
            this.remove(item.id);
          }
        });
      })
    };
    this.queue.push(queueItem);
  }

  public remove(id: number): void {
    this.queue = this.queue.filter((item) => item.id !== id);
  }

  public processAck(id: number): void {
    console.warn("PROCESSING ACK", id);
    console.log(this.queue);
    this.ackNotifier.emit(id);
  }

  public processError(e: packetError): void {
    console.warn("PROCESSING ERROR", e.id);
    console.log(this.queue);
    this.errorNotifier.emit(e);
  }

  public async wait(id: number): Promise<number> {
    const queueItem = this.queue.find((qi) => qi.id === id);
    if (!queueItem) {
      throw new Error("Packet does not exist");
    }

    return queueItem.promise;
  }

  public async processQueue(
    writeToRadio: (data: Uint8Array) => Promise<void>
  ): Promise<void> {
    if (this.locked) {
      return;
    }
    this.locked = true;
    while (this.queue.filter((p) => !p.waitingAck).length > 0) {
      const item = this.queue.filter((p) => !p.waitingAck)[0];
      if (item) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        await writeToRadio(item.data);
        item.waitingAck = true;
      }
    }
    setTimeout(() => {
      this.locked = false;
    }, 100);
  }
}
