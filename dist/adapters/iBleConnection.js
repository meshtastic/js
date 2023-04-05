import { Types } from "../index.js";
import { fromNumUUID, fromRadioUUID, serviceUUID, toRadioUUID, } from "../constants.js";
import { IMeshDevice } from "../iMeshDevice.js";
import { typedArrayToBuffer } from "../utils/general.js";
/** Allows to connect to a Meshtastic device via bluetooth */
export class IBLEConnection extends IMeshDevice {
    /** Defines the connection type as ble */
    connType;
    /** Currently connected BLE device */
    device;
    GATTServer;
    /** Short Description */
    service;
    /** Short Description */
    toRadioCharacteristic;
    /** Short Description */
    fromRadioCharacteristic;
    /** Short Description */
    fromNumCharacteristic;
    /** States if the device was force disconnected by a user */
    userInitiatedDisconnect;
    constructor(configId) {
        super(configId);
        this.log = this.log.getSubLogger({ name: "iHttpConnection" });
        this.connType = "ble";
        this.device = undefined;
        this.service = undefined;
        this.GATTServer = undefined;
        this.toRadioCharacteristic = undefined;
        this.fromRadioCharacteristic = undefined;
        this.fromNumCharacteristic = undefined;
        this.userInitiatedDisconnect = false;
        // this.pendingRead = false;
        this.log.debug(Types.Emitter[Types.Emitter.constructor], "🔷 iBleConnection instantiated");
    }
    /**
     * Gets web bluetooth support avaliability for the device
     *
     * @returns {Promise<void>}
     */
    supported() {
        return navigator.bluetooth.getAvailability();
    }
    /**
     * Gets list of bluetooth devices that can be passed to `connect`
     *
     * @returns {Promise<BluetoothDevice[]>} Array of avaliable BLE devices
     */
    getDevices() {
        return navigator.bluetooth.getDevices();
    }
    /**
     * Opens browser dialog to select a device
     */
    getDevice(filter) {
        return navigator.bluetooth.requestDevice(filter ?? {
            filters: [{ services: [serviceUUID] }],
        });
    }
    /**
     * Initiates the connect process to a Meshtastic device via Bluetooth
     */
    async connect({ device, deviceFilter, }) {
        /** Set device state to connecting */
        this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTING);
        /** Set device if specified, else request. */
        this.device = device ?? (await this.getDevice(deviceFilter));
        /** Setup event listners */
        this.device.addEventListener("gattserverdisconnected", () => {
            this.log.info(Types.Emitter[Types.Emitter.connect], "Device disconnected");
            this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
            this.complete();
        });
        /** Connect to device */
        await this.device.gatt
            ?.connect()
            .then((server) => {
            this.log.info(Types.Emitter[Types.Emitter.connect], `✅ Got GATT Server for device: ${server.device.id}`);
            this.GATTServer = server;
        })
            .catch((e) => {
            this.log.error(Types.Emitter[Types.Emitter.connect], `❌ Failed to connect: ${e.message}`);
        });
        await this.GATTServer?.getPrimaryService(serviceUUID)
            .then((service) => {
            this.log.info(Types.Emitter[Types.Emitter.connect], `✅ Got GATT Service for device: ${service.device.id}`);
            this.service = service;
        })
            .catch((e) => {
            this.log.error(Types.Emitter[Types.Emitter.connect], `❌ Failed to get primary service: q${e.message}`);
        });
        [toRadioUUID, fromRadioUUID, fromNumUUID].map(async (uuid) => {
            await this.service
                ?.getCharacteristic(uuid)
                .then((characteristic) => {
                this.log.info(Types.Emitter[Types.Emitter.connect], `✅ Got Characteristic ${characteristic.uuid} for device: ${characteristic.uuid}`);
                switch (uuid) {
                    case toRadioUUID:
                        this.toRadioCharacteristic = characteristic;
                        break;
                    case fromRadioUUID:
                        this.fromRadioCharacteristic = characteristic;
                        break;
                    case fromNumUUID:
                        this.fromNumCharacteristic = characteristic;
                        break;
                }
            })
                .catch((e) => {
                this.log.error(Types.Emitter[Types.Emitter.connect], `❌ Failed to get toRadio characteristic: q${e.message}`);
            });
        });
        await this.fromNumCharacteristic?.startNotifications(); // TODO: catch
        this.fromNumCharacteristic?.addEventListener("characteristicvaluechanged", () => {
            void this.readFromRadio();
        });
        this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTED);
        void this.configure().catch(() => {
            // TODO: FIX, workaround for `wantConfigId` not getting acks.
        });
    }
    /** Disconnects from the Meshtastic device */
    disconnect() {
        this.userInitiatedDisconnect = true;
        this.device?.gatt?.disconnect();
        this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
        this.complete();
    }
    /**
     * Pings device to check if it is avaliable
     *
     * @todo Implement
     */
    async ping() {
        return Promise.resolve(true);
    }
    /** Short description */
    async readFromRadio() {
        // if (this.pendingRead) {
        //   return Promise.resolve();
        // }
        // this.pendingRead = true;
        let readBuffer = new ArrayBuffer(1);
        while (readBuffer.byteLength > 0 && this.fromRadioCharacteristic) {
            await this.fromRadioCharacteristic
                .readValue()
                .then((value) => {
                readBuffer = value.buffer;
                if (value.byteLength > 0) {
                    this.handleFromRadio(new Uint8Array(readBuffer));
                }
                this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTED);
            })
                .catch((e) => {
                readBuffer = new ArrayBuffer(0);
                this.log.error(Types.Emitter[Types.Emitter.readFromRadio], `❌ ${e.message}`);
            });
        }
        // this.pendingRead = false;
    }
    /**
     * Sends supplied protobuf message to the radio
     */
    async writeToRadio(data) {
        await this.toRadioCharacteristic?.writeValue(typedArrayToBuffer(data));
        // This should be automatic (onCharacteristicValueChanged)
        await this.readFromRadio();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaUJsZUNvbm5lY3Rpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvYWRhcHRlcnMvaUJsZUNvbm5lY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNwQyxPQUFPLEVBQ0wsV0FBVyxFQUNYLGFBQWEsRUFDYixXQUFXLEVBQ1gsV0FBVyxHQUNaLE1BQU0saUJBQWlCLENBQUM7QUFDekIsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ2hELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRXpELDZEQUE2RDtBQUM3RCxNQUFNLE9BQU8sY0FBZSxTQUFRLFdBQVc7SUFDN0MseUNBQXlDO0lBQ3pDLFFBQVEsQ0FBMkI7SUFFbkMscUNBQXFDO0lBQ3JDLE1BQU0sQ0FBOEI7SUFFcEMsVUFBVSxDQUF3QztJQUVsRCx3QkFBd0I7SUFDeEIsT0FBTyxDQUF5QztJQUVoRCx3QkFBd0I7SUFDeEIscUJBQXFCLENBQWdEO0lBRXJFLHdCQUF3QjtJQUN4Qix1QkFBdUIsQ0FBZ0Q7SUFFdkUsd0JBQXdCO0lBQ3hCLHFCQUFxQixDQUFnRDtJQUVyRSw0REFBNEQ7SUFDNUQsdUJBQXVCLENBQVU7SUFFakMsWUFBWSxRQUFpQjtRQUMzQixLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFaEIsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFFOUQsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFDdEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUM7UUFDeEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUM7UUFDekIsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUM7UUFDNUIs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