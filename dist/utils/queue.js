import { SubEvent } from "sub-events";
import { Protobuf } from "../index.js";
export class Queue {
    queue = [];
    lock = false;
    ackNotifier = new SubEvent();
    errorNotifier = new SubEvent();
    timeout;
    constructor() {
        this.timeout = 60000;
    }
    clear() {
        this.queue = [];
    }
    push(item) {
        const queueItem = {
            ...item,
            sent: false,
            promise: new Promise((resolve, reject) => {
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
                        console.warn(`Packet ${item.id} timed out`);
                        reject({
                            id: item.id,
                            error: Protobuf.Routing_Error.TIMEOUT,
                        });
                    }
                }, this.timeout);
            }),
        };
        this.queue.push(queueItem);
    }
    remove(id) {
        if (this.lock) {
            setTimeout(() => this.remove(id), 100);
            return;
        }
        this.queue = this.queue.filter((item) => item.id !== id);
    }
    processAck(id) {
        this.ackNotifier.emit(id);
    }
    processError(e) {
        console.error(`Error received for packet ${e.id}: ${e.error}`);
        this.errorNotifier.emit(e);
    }
    async wait(id) {
        const queueItem = this.queue.find((qi) => qi.id === id);
        if (!queueItem) {
            throw new Error("Packet does not exist");
        }
        return queueItem.promise;
    }
    async processQueue(writeToRadio) {
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
                }
                catch (error) {
                    console.error(`Error sending packet ${item.id}`, error);
                }
            }
        }
        this.lock = false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVldWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdXRpbHMvcXVldWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUN0QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBVXZDLE1BQU0sT0FBTyxLQUFLO0lBQ1IsS0FBSyxHQUFpQixFQUFFLENBQUM7SUFDekIsSUFBSSxHQUFHLEtBQUssQ0FBQztJQUNiLFdBQVcsR0FBRyxJQUFJLFFBQVEsRUFBVSxDQUFDO0lBQ3JDLGFBQWEsR0FBRyxJQUFJLFFBQVEsRUFBZSxDQUFDO0lBQzVDLE9BQU8sQ0FBUztJQUV4QjtRQUNFLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO0lBQ3ZCLENBQUM7SUFFTSxLQUFLO1FBQ1YsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7SUFDbEIsQ0FBQztJQUVNLElBQUksQ0FBQyxJQUEwQztRQUNwRCxNQUFNLFNBQVMsR0FBZTtZQUM1QixHQUFHLElBQUk7WUFDUCxJQUFJLEVBQUUsS0FBSztZQUNYLE9BQU8sRUFBRSxJQUFJLE9BQU8sQ0FBUyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFDL0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTtvQkFDaEMsSUFBSSxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRTt3QkFDbEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQ3JCLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztxQkFDYjtnQkFDSCxDQUFDLENBQUMsQ0FBQztnQkFDSCxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO29CQUNqQyxJQUFJLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxD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