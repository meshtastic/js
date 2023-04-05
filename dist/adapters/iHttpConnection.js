import { Types } from "../index.js";
import { IMeshDevice } from "../iMeshDevice.js";
import { typedArrayToBuffer } from "../utils/general.js";
/** Allows to connect to a Meshtastic device over HTTP(S) */
export class IHTTPConnection extends IMeshDevice {
    /** Defines the connection type as http */
    connType;
    /** URL of the device that is to be connected to. */
    url;
    /** Enables receiving messages all at once, versus one per request */
    receiveBatchRequests;
    readLoop;
    peningRequest;
    abortController;
    constructor(configId) {
        super(configId);
        this.log = this.log.getSubLogger({ name: "iHttpConnection" });
        this.connType = "http";
        this.url = "http://meshtastic.local";
        this.receiveBatchRequests = false;
        this.readLoop = null;
        this.peningRequest = false;
        this.abortController = new AbortController();
        this.log.debug(Types.Emitter[Types.Emitter.constructor], "🔷 iHttpConnection instantiated");
    }
    /**
     * Initiates the connect process to a Meshtastic device via HTTP(S)
     */
    async connect({ address, fetchInterval = 3000, receiveBatchRequests = false, tls = false, }) {
        this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTING);
        this.receiveBatchRequests = receiveBatchRequests;
        this.url = `${tls ? "https://" : "http://"}${address}`;
        if (this.deviceStatus === Types.DeviceStatusEnum.DEVICE_CONNECTING &&
            (await this.ping())) {
            this.log.debug(Types.Emitter[Types.Emitter.connect], "Ping succeeded, starting configuration and request timer.");
            void this.configure().catch(() => {
                // TODO: FIX, workaround for `wantConfigId` not getting acks.
            });
            this.readLoop = setInterval(() => {
                this.readFromRadio().catch((e) => {
                    this.log.error(Types.Emitter[Types.Emitter.connect], `❌ ${e.message}`);
                });
            }, fetchInterval);
        }
        else {
            if (this.deviceStatus !== Types.DeviceStatusEnum.DEVICE_DISCONNECTED) {
                setTimeout(() => {
                    void this.connect({
                        address: address,
                        fetchInterval: fetchInterval,
                        receiveBatchRequests: receiveBatchRequests,
                        tls: tls,
                    });
                }, 10000);
            }
        }
    }
    /** Disconnects from the Meshtastic device */
    disconnect() {
        this.abortController.abort();
        this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
        if (this.readLoop) {
            clearInterval(this.readLoop);
            this.complete();
        }
    }
    /** Pings device to check if it is avaliable */
    async ping() {
        this.log.debug(Types.Emitter[Types.Emitter.ping], "Attempting device ping.");
        const { signal } = this.abortController;
        let pingSuccessful = false;
        await fetch(`${this.url}/hotspot-detect.html`, { signal, mode: "no-cors" })
            .then(() => {
            pingSuccessful = true;
            this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTED);
        })
            .catch((e) => {
            pingSuccessful = false;
            this.log.error(Types.Emitter[Types.Emitter.ping], `❌ ${e.message}`);
            this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_RECONNECTING);
        });
        return pingSuccessful;
    }
    /** Reads any avaliable protobuf messages from the radio */
    async readFromRadio() {
        if (this.peningRequest) {
            return;
        }
        let readBuffer = new ArrayBuffer(1);
        const { signal } = this.abortController;
        while (readBuffer.byteLength > 0) {
            this.peningRequest = true;
            await fetch(`${this.url}/api/v1/fromradio?all=${this.receiveBatchRequests ? "true" : "false"}`, {
                signal,
                method: "GET",
                headers: {
                    Accept: "application/x-protobuf",
                },
            })
                .then(async (response) => {
                this.peningRequest = false;
                this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTED);
                readBuffer = await response.arrayBuffer();
                if (readBuffer.byteLength > 0) {
                    this.handleFromRadio(new Uint8Array(readBuffer));
                }
            })
                .catch((e) => {
                this.peningRequest = false;
                this.log.error(Types.Emitter[Types.Emitter.readFromRadio], `❌ ${e.message}`);
                this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_RECONNECTING);
            });
        }
    }
    /**
     * Sends supplied protobuf message to the radio
     */
    async writeToRadio(data) {
        const { signal } = this.abortController;
        await fetch(`${this.url}/api/v1/toradio`, {
            signal,
            method: "PUT",
            headers: {
                "Content-Type": "application/x-protobuf",
            },
            body: typedArrayToBuffer(data),
        })
            .then(async () => {
            this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTED);
            await this.readFromRadio().catch((e) => {
                this.log.error(Types.Emitter[Types.Emitter.writeToRadio], `❌ ${e.message}`);
            });
        })
            .catch((e) => {
            this.log.error(Types.Emitter[Types.Emitter.writeToRadio], `❌ ${e.message}`);
            this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_RECONNECTING);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaUh0dHBDb25uZWN0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2FkYXB0ZXJzL2lIdHRwQ29ubmVjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3BDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNoRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUV6RCw0REFBNEQ7QUFDNUQsTUFBTSxPQUFPLGVBQWdCLFNBQVEsV0FBVztJQUM5QywwQ0FBMEM7SUFDMUMsUUFBUSxDQUEyQjtJQUVuQyxvREFBb0Q7SUFDcEQsR0FBRyxDQUFTO0lBRVoscUVBQXFFO0lBQ3JFLG9CQUFvQixDQUFVO0lBRTlCLFFBQVEsQ0FBd0M7SUFFaEQsYUFBYSxDQUFVO0lBRXZCLGVBQWUsQ0FBa0I7SUFFakMsWUFBWSxRQUFpQjtRQUMzQixLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFaEIsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFFOUQsSUFBSSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUM7UUFDdkIsSUFBSSxDQUFDLEdBQUcsR0FBRyx5QkFBeUIsQ0FBQztRQUNyQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsS0FBSyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDO1FBQzNCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUU3QyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FDWixLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFD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