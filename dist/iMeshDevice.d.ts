import { Logger } from "tslog";
import { Protobuf, Types } from "./index.js";
import { EventSystem } from "./utils/eventSystem.js";
import { Queue } from "./utils/queue.js";
import { XModem } from "./utils/xmodem.js";
/** Base class for connection methods to extend */
export declare abstract class IMeshDevice {
    /** Abstract property that states the connection type */
    protected abstract connType: Types.ConnectionTypeName;
    /** Logs to the console and the logging event emitter */
    protected log: Logger<unknown>;
    /** Describes the current state of the device */
    protected deviceStatus: Types.DeviceStatusEnum;
    /** Describes the current state of the device */
    protected isConfigured: boolean;
    /** Are there any settings that have yet to be applied? */
    protected pendingSettingsChanges: boolean;
    /** Device's node number */
    private myNodeInfo;
    /** Randomly generated number to ensure confiuration lockstep */
    configId: number;
    /**
     * Packert queue, to space out transmissions and routing handle errors and
     * acks
     */
    queue: Queue;
    events: EventSystem;
    XModem: XModem;
    constructor(configId?: number);
    /** Abstract method that writes data to the radio */
    protected abstract writeToRadio(data: Uint8Array): Promise<void>;
    /** Abstract method that connects to the radio */
    protected abstract connect(parameters: Types.ConnectionParameters): Promise<void>;
    /** Abstract method that disconnects from the radio */
    protected abstract disconnect(): void;
    /** Abstract method that pings the radio */
    protected abstract ping(): Promise<boolean>;
    /**
     * Sends a text over the radio
     */
    sendText(text: string, destination?: Types.Destination, wantAck?: boolean, channel?: Types.ChannelNumber): Promise<number>;
    /**
     * Sends a text over the radio
     */
    sendWaypoint(waypointMessage: Protobuf.Waypoint, destination: Types.Destination, channel?: Types.ChannelNumber): Promise<number>;
    /**
     * Sends packet over the radio
     */
    sendPacket(byteData: Uint8Array, portNum: Protobuf.PortNum, destination: Types.Destination, channel?: Types.ChannelNumber, wantAck?: boolean, wantResponse?: boolean, echoResponse?: boolean, replyId?: number, emoji?: number): Promise<number>;
    /**
     * Sends raw packet over the radio
     */
    sendRaw(toRadio: Uint8Array, id?: number): Promise<number>;
    /**
     * Writes config to device
     */
    setConfig(config: Protobuf.Config): Promise<number>;
    /**
     * Writes module config to device
     */
    setModuleConfig(moduleConfig: Protobuf.ModuleConfig): Promise<number>;
    /**
     * Sets devices owner data
     */
    setOwner(owner: Protobuf.User): Promise<number>;
    /**
     * Sets devices ChannelSettings
     */
    setChannel(channel: Protobuf.Channel): Promise<number>;
    setPosition(positionMessage: Protobuf.Position): Promise<number>;
    /**
     * Gets specified channel information from the radio
     */
    getChannel(index: number): Promise<number>;
    /**
     * Gets devices config
     *   request
     */
    getConfig(configType: Protobuf.AdminMessage_ConfigType): Promise<number>;
    /**
     * Gets Module config
     */
    getModuleConfig(moduleConfigType: Protobuf.AdminMessage_ModuleConfigType): Promise<number>;
    /** Gets devices Owner */
    getOwner(): Promise<number>;
    /**
     * Gets devices metadata
     */
    getMetadata(nodeNum: number): Promise<number>;
    /**
     * Clears specific channel with the designated index
     */
    clearChannel(index: number): Promise<number>;
    private beginEditSettings;
    commitEditSettings(): Promise<number>;
    /**
     * Resets the internal NodeDB of the radio, usefull for removing old nodes
     * that no longer exist.
     */
    resetPeers(): Promise<number>;
    /** Shuts down the current node after the specified amount of time has elapsed. */
    shutdown(time: number): Promise<number>;
    /** Reboots the current node after the specified amount of time has elapsed. */
    reboot(time: number): Promise<number>;
    /**
     * Reboots the current node into OTA mode after the specified amount of time
     * has elapsed.
     */
    rebootOTA(time: number): Promise<number>;
    /** Factory resets the current node */
    factoryReset(): Promise<number>;
    /** Triggers the device configure process */
    configure(): Promise<number>;
    /** Sends a trace route packet to the designated node */
    traceRoute(destination: number): Promise<number>;
    /** Requests position from the designated node */
    requestPosition(destination: number): Promise<number>;
    /**
     * Updates the device status eliminating duplicate status events
     */
    updateDeviceStatus(status: Types.DeviceStatusEnum): void;
    /**
     * Generates random packet identifier
     *
     * @returns {number} Random packet ID
     */
    private generateRandId;
    /**
     * Gets called whenever a fromRadio message is received from device, returns
     * fromRadio data
     */
    protected handleFromRadio(fromRadio: Uint8Array): void;
    /** Completes all SubEvents */
    complete(): void;
    /**
     * Gets called when a MeshPacket is received from device
     */
    private handleMeshPacket;
    private handleDecodedPacket;
}
