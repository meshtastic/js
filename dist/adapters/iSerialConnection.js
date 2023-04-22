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
    readerHack;
    /** Transform stream for parsing raw serial data */
    transformer;
    /** Should locks be prevented */
    preventLock;
    /** Unfortunately, this is currently the only way to release the lock on a stream after piping it
     *  through a transform stream (https://stackoverflow.com/questions/71262432) */
    pipePromise;
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
            await this.pipePromise?.catch(() => { });
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
    getCurrentPort() {
        return this.port;
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
                this.pipePromise = this.port.readable.pipeTo(this.transformer.writable);
                const reader = this.readerHack = this.transformer.readable.getReader();
                void this.readFromRadio(reader);
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
        // this.onReleaseEvent.emit(true);
        // HACK: Inline onReleaseEvent
        // -- This should be used as an event, like intened
        this.preventLock = true;
        await this.readerHack?.cancel();
        await this.pipePromise?.catch(() => { });
        this.readerHack?.releaseLock();
        if (this.port?.readable)
            await this.port?.close();
        // -------
        this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
        this.complete();
        // await this.onReleaseEvent.toPromise();
        return this.port;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaVNlcmlhbENvbm5lY3Rpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvYWRhcHRlcnMvaVNlcmlhbENvbm5lY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUV0QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3BDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNoRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUVoRSw4REFBOEQ7QUFDOUQsTUFBTSxPQUFPLGlCQUFrQixTQUFRLFdBQVc7SUFDaEQsNENBQTRDO0lBQzVDLFFBQVEsQ0FBMkI7SUFFbkMsbURBQW1EO0lBQzNDLElBQUksQ0FBeUI7SUFDNUIsVUFBVSxDQUFzRDtJQUN6RSxtREFBbUQ7SUFDM0MsV0FBVyxDQUEyQztJQUU5RCxnQ0FBZ0M7SUFDeEIsV0FBVyxDQUFXO0lBRTlCO29GQUNnRjtJQUN4RSxXQUFXLENBQWlCO0lBRXBDOzs7OztPQUtHO0lBQ2MsY0FBYyxDQUFvQjtJQUVuRCxZQUFZLFFBQWlCO1FBQzNCLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUVoQixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLENBQUMsQ0FBQztRQUVoRSxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixJQUFJLENBQUMsSUFBSSxHQUFHLFNBQVMsQ0FBQztRQUN0QixJQUFJLENBQUMsV0FBVyxHQUFHLFNBQVMsQ0FBQztRQUM3QixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksUUFBUSxFQUFXLENBQUM7UUFDOUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFFekIsSUFBSSxDQUFDLEdBQUcs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