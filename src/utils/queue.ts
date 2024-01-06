import { SubEvent } from "sub-events";
import * as Protobuf from "../protobufs.js";
import { PacketError, QueueItem } from "../types.js";

export class Queue {
  private queue: QueueItem[] = [];
  private lock = false;
  private ackNotifier = new SubEvent<number>();
  private errorNotifier = new SubEvent<PacketError>();
  private timeout: number;

  constructor() {
    this.timeout = 60000;
  }

  public getState(): QueueItem[] {
    return this.queue;
  }

  public clear(): void {
    this.queue = [];
  }

  public push(item: Omit<QueueItem, "promise" | "sent" | "added">): void {
    const queueItem: QueueItem = {
      ...item,
      sent: false,
      added: new Date(),
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
            const decoded = Protobuf.Mesh.ToRadio.fromBinary(item.data);
            console.warn(
              `Packet ${item.id} of type ${decoded.payloadVariant.case} timed out`,
            );

            reject({
              id: item.id,
              error: Protobuf.Mesh.Routing_Error.TIMEOUT,
            });
          }
        }, this.timeout);
      }),
    };
    this.queue.push(queueItem);
  }

  public remove(id: number): void {
    if (this.lock) {
      setTimeout(() => this.remove(id), 100);
      return;
    }
    this.queue = this.queue.filter((item) => item.id !== id);
  }

  public processAck(id: number): void {
    this.ackNotifier.emit(id);
  }

  public processError(e: PacketError): void {
    console.error(
      `Error received for packet ${e.id}: ${
        Protobuf.Mesh.Routing_Error[e.error]
      }`,
    );
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
    writeToRadio: (data: Uint8Array) => Promise<void>,
  ): Promise<void> {
    if (this.lock) {
      return;
    }
    this.lock = true;
    while (this.queue.filter((p) => !p.sent).length > 0) {
      const item = this.queue.filter((p) => !p.sent)[0];
      if (item) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        try {
          await writeToRadio(item.data);
          item.sent = true;
        } catch (error) {
          console.error(`Error sending packet ${item.id}`, error);
        }
      }
    }
    this.lock = false;
  }
}
