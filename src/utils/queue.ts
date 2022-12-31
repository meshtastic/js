import { SubEvent } from "sub-events";
import { Protobuf } from "../index.js";
import { PacketError } from "../types.js";

export interface IQueueItem {
  id: number;
  data: Uint8Array;
  sent: boolean;
  promise: Promise<number>;
}

export class Queue {
  private queue: IQueueItem[] = [];
  private locked = false;
  private ackNotifier = new SubEvent<number>();
  private errorNotifier = new SubEvent<PacketError>();

  public clear(): void {
    this.queue = [];
  }

  public push(item: Omit<IQueueItem, "promise" | "sent">): void {
    const queueItem: IQueueItem = {
      ...item,
      sent: false,
      promise: new Promise<number>((resolve, reject) => {
        this.ackNotifier.subscribe((id) => {
          if (item.id === id) {
            this.remove(item.id);
            resolve(id);
          }
        });
        this.errorNotifier.subscribe((e) => {
          if (item.id === e.id) {
            this.remove(item.id);
            reject(e);
          }
        });
        setTimeout(() => {
          if (this.queue.findIndex((qi) => qi.id === item.id) !== -1) {
            this.remove(item.id);
            console.warn(`REMOVING PACKET THAT TIMED OUT ${item.id}`);

            reject({
              id: item.id,
              error: Protobuf.Routing_Error.TIMEOUT
            });
          }
        }, 60000);
      })
    };
    this.queue.push(queueItem);
  }

  public remove(id: number): void {
    this.queue = this.queue.filter((item) => item.id !== id);
  }

  public processAck(id: number): void {
    this.ackNotifier.emit(id);
  }

  public processError(e: PacketError): void {
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
    while (this.queue.filter((p) => !p.sent).length > 0) {
      const item = this.queue.filter((p) => !p.sent)[0];
      if (item) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        await writeToRadio(item.data);
        item.sent = true;
      }
    }
    setTimeout(() => {
      this.locked = false;
    }, 100);
  }
}
