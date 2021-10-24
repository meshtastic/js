export interface IQueueItem {
  id: number;
  callback: (id: number) => Promise<void>;
}

export class responseQueue {
  private queue: IQueueItem[] = [];

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

  public async process(id: number): Promise<void> {
    const item = this.queue.find((queueItem) => queueItem.id === id);

    if (item) {
      await item.callback(id);
      this.remove(item.id);
    }
  }
}
