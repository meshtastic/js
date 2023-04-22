import { Types } from "../index.js";
import { IMeshDevice } from "../iMeshDevice.js";
/** Allows to connect to a Meshtastic device over HTTP(S) */
export declare class IHTTPConnection extends IMeshDevice {
    /** Defines the connection type as http */
    connType: Types.ConnectionTypeName;
    /** URL of the device that is to be connected to. */
    url: string;
    /** Enables receiving messages all at once, versus one per request */
    receiveBatchRequests: boolean;
    readLoop: ReturnType<typeof setInterval> | null;
    peningRequest: boolean;
    abortController: AbortController;
    constructor(configId?: number);
    /**
     * Initiates the connect process to a Meshtastic device via HTTP(S)
     */
    connect({ address, fetchInterval, receiveBatchRequests, tls, }: Types.HTTPConnectionParameters): Promise<void>;
    /** Disconnects from the Meshtastic device */
    disconnect(): void;
    /** Pings device to check if it is avaliable */
    ping(): Promise<boolean>;
    /** Reads any avaliable protobuf messages from the radio */
    protected readFromRadio(): Promise<void>;
    /**
     * Sends supplied protobuf message to the radio
     */
    protected writeToRadio(data: Uint8Array): Promise<void>;
}
