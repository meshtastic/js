export interface IQueueItem {
  id: number;
  data: Uint8Array;
  callback: (id: number) => Promise<void>;
  waitingAck: boolean;
}

export class Queue {
  private queue: IQueueItem[] = [];
  private locked = false;

  public clear(): void {
    this.queue = [];
  }

  public push(item: IQueueItem): void {
    this.queue.push(item);
  }

  public remove(id: number): void {
    this.queue = this.queue.filter((item) => {
      return item.id !== id;
    });
  }

  public async processAck(id: number): Promise<void> {
    const item = this.queue.find((queueItem) => queueItem.id === id);

    if (item) {
      await item.callback(id);
      this.remove(item.id);
    }
  }

  public async processQueue(
    writeToRadio: (data: Uint8Array) => Promise<void>
  ): Promise<void> {
    if (this.locked) {
      return;
    }
    this.locked = true;
    while (this.queue.filter((p) => !p.waitingAck).length > 0) {
      const item = this.queue.filter((p) => !p.waitingAck).shift();
      if (item) {
        //delay 300ms
        await new Promise((resolve) => setTimeout(resolve, 300));
        await writeToRadio(item.data);
        item.waitingAck = true;
        this.queue.push(item);
      }
    }
    this.locked = false;
  }
}
