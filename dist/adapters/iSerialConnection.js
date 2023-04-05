import { SubEvent } from "sub-events";
import { Types } from "../index.js";
import { IMeshDevice } from "../iMeshDevice.js";
import { transformHandler } from "../utils/transformHandler.js";
/** Allows to connect to a Meshtastic device over WebSerial */
export class ISerialConnection extends IMeshDevice {
    /** Defines the connection type as serial */
    connType;
    /** Serial port used to communicate with device. */
    port;
    /** Transform stream for parsing raw serial data */
    transformer;
    /** Should locks be prevented */
    preventLock;
    /**
     * Fires when `disconnect()` is called, used to instruct serial port and
     * readers to release there locks
     *
     * @event onReleaseEvent
     */
    onReleaseEvent;
    constructor(configId) {
        super(configId);
        this.log = this.log.getSubLogger({ name: "iSerialConnection" });
        this.connType = "serial";
        this.port = undefined;
        this.transformer = undefined;
        this.onReleaseEvent = new SubEvent();
        this.preventLock = false;
        this.log.debug(Types.Emitter[Types.Emitter.constructor], "🔷 iSerialConnection instantiated");
    }
    /**
     * Reads packets from transformed serial port steam and processes them.
     */
    async readFromRadio(reader) {
        this.onReleaseEvent.subscribe(async () => {
            this.preventLock = true;
            await reader.cancel();
            reader.releaseLock();
            await this.port?.close();
        });
        while (this.port?.readable && !this.preventLock) {
            await reader
                .read()
                .then(({ value }) => {
                if (value) {
                    this.handleFromRadio(value);
                }
            })
                .catch(() => {
                this.log.debug(Types.Emitter[Types.Emitter.readFromRadio], `Releasing reader`);
                ("Releasing reader");
            });
        }
    }
    /** Gets list of serial ports that can be passed to `connect` */
    async getPorts() {
        return navigator.serial.getPorts();
    }
    /**
     * Opens browsers connection dialogue to select a serial port
     */
    async getPort(filter) {
        return navigator.serial.requestPort(filter);
    }
    /**
     * Initiates the connect process to a Meshtastic device via Web Serial
     */
    async connect({ port, baudRate = 115200, concurrentLogOutput = false, }) {
        /** Set device state to connecting */
        this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTING);
        /** Set device if specified, else request. */
        this.port = port ?? (await this.getPort());
        /** Setup event listners */
        this.port.addEventListener("disconnect", () => {
            this.log.info(Types.Emitter[Types.Emitter.connect], "Device disconnected");
            this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
            this.complete();
        });
        /** Connect to device */
        await this.port
            .open({
            baudRate,
        })
            .then(() => {
            if (this.port?.readable && this.port.writable) {
                this.transformer = transformHandler(this.log, this.onReleaseEvent, this.events.onDeviceDebugLog, concurrentLogOutput);
                const reader = this.port.readable.pipeThrough(this.transformer);
                void this.readFromRadio(reader.getReader());
                this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTED);
                void this.configure().catch(() => {
                    // TODO: FIX, workaround for `wantConfigId` not getting acks.
                });
            }
            else {
                console.log("not readable or writable");
            }
        })
            .catch((e) => {
            this.log.error(Types.Emitter[Types.Emitter.connect], `❌ ${e.message}`);
        });
    }
    /** Disconnects from the serial port */
    async reconnect() {
        await this.connect({
            port: this.port,
            concurrentLogOutput: false,
        });
    }
    /** Disconnects from the serial port */
    async disconnect() {
        this.onReleaseEvent.emit(true);
        this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
        this.complete();
        return await this.port?.close();
    }
    /** Pings device to check if it is avaliable */
    async ping() {
        return Promise.resolve(true);
    }
    /**
     * Sends supplied protobuf message to the radio
     */
    async writeToRadio(data) {
        while (this.port?.writable?.locked) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        const writer = this.port?.writable?.getWriter();
        await writer?.write(new Uint8Array([0x94, 0xc3, 0x00, data.length, ...data]));
        writer?.releaseLock();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaVNlcmlhbENvbm5lY3Rpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvYWRhcHRlcnMvaVNlcmlhbENvbm5lY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUV0QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3BDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNoRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUVoRSw4REFBOEQ7QUFDOUQsTUFBTSxPQUFPLGlCQUFrQixTQUFRLFdBQVc7SUFDaEQsNENBQTRDO0lBQzVDLFFBQVEsQ0FBMkI7SUFFbkMsbURBQW1EO0lBQzNDLElBQUksQ0FBeUI7SUFFckMsbURBQW1EO0lBQzNDLFdBQVcsQ0FBMkM7SUFFOUQsZ0NBQWdDO0lBQ3hCLFdBQVcsQ0FBVztJQUU5Qjs7Ozs7T0FLRztJQUNjLGNBQWMsQ0FBb0I7SUFFbkQsWUFBWSxRQUFpQjtRQUMzQixLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFaEIsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxDQUFDLENBQUM7UUFFaEUsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLElBQUksR0FBRyxTQUFTLENBQUM7UUFDdEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUM7UUFDN0IsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLFFBQVEsRUFBVyxDQUFDO1FBQzlDLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO1FBRXpCLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUNaLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9B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