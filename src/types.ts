import type {
  IBLEConnection,
  IHTTPConnection,
  ISerialConnection
} from "./index.js";
import type {
  LogRecord_Level,
  MeshPacket,
  NodeInfo,
  Position,
  Routing,
  User,
  Waypoint
} from "./generated/mesh.js";
import { DeviceMetadata } from "./generated/device_metadata.js";
import { ModuleConfig } from "./generated/module_config.js";
import { Config } from "./generated/config.js";
import { Channel } from "./generated/channel.js";
import { HardwareMessage } from "./generated/remote_hardware.js";
import { Telemetry } from "./generated/telemetry.js";

export enum DeviceStatusEnum {
  DEVICE_RESTARTING,
  DEVICE_DISCONNECTED,
  DEVICE_CONNECTING,
  DEVICE_RECONNECTING,
  DEVICE_CONNECTED,
  DEVICE_CONFIGURING,
  DEVICE_CONFIGURED
}

export type DeviceInterface =
  | IHTTPConnection
  | IBLEConnection
  | ISerialConnection;

export type ConnectionParameters =
  | HTTPConnectionParameters
  | BLEConnectionParameters
  | SerialConnectionParameters;

export interface HTTPConnectionParameters {
  /**
   * address The IP Address/Domain to connect to, without protocol
   */
  address: string;
  /**
   * Enables transport layer security. Notes: Slower, devices' certificate must be trusted by the browser
   */
  tls?: boolean;
  /**
   * Enables receiving messages all at once, versus one per request
   */
  receiveBatchRequests?: boolean;
  /**
   * (ms) Sets a fixed interval in that the device is fetched for new messages, defaults to 5 seconds
   */
  fetchInterval: number;
}

export interface BLEConnectionParameters {
  /**
   * Optional filter options for the web bluetooth api requestDevice() method
   */
  deviceFilter?: RequestDeviceOptions;
  /**
   * Connect directly to a Bluetooth deivce, obtained from `getDevices()`
   */
  device?: BluetoothDevice;
}

export interface SerialConnectionParameters {
  baudRate?: number;
  /**
   * Connect directly to a Serial port, obtained from `getPorts()`
   */
  port?: SerialPort;
}

export type LogEventPacket = LogEvent & { date: Date };

export interface NodeInfoPacket {
  packet: MeshPacket;
  data: NodeInfo;
}

export interface UserPacket {
  packet: MeshPacket;
  data: User;
}

export interface RoutingPacket {
  packet: MeshPacket;
  data: Routing;
}

export interface PositionPacket {
  packet: MeshPacket;
  data: Position;
}

export interface MessagePacket {
  packet: MeshPacket;
  text: string;
}

export interface PingPacket {
  packet: MeshPacket;
  data: Uint8Array;
}

export interface IpTunnelPacket {
  packet: MeshPacket;
  data: Uint8Array;
}

export interface SerialPacket {
  packet: MeshPacket;
  data: Uint8Array;
}

export interface StoreForwardPacket {
  packet: MeshPacket;
  data: Uint8Array;
}

export interface RangeTestPacket {
  packet: MeshPacket;
  data: Uint8Array;
}

export interface TelemetryPacket {
  packet: MeshPacket;
  data: Telemetry;
}

export interface PrivatePacket {
  packet: MeshPacket;
  data: Uint8Array;
}

export interface AtakPacket {
  packet: MeshPacket;
  data: Uint8Array;
}

export interface RemoteHardwarePacket {
  packet: MeshPacket;
  data: HardwareMessage;
}

export interface ChannelPacket {
  packet: MeshPacket;
  data: Channel;
}

export interface ConfigPacket {
  packet: MeshPacket;
  data: Config;
}

export interface ModuleConfigPacket {
  packet: MeshPacket;
  data: ModuleConfig;
}

export interface DeviceMetadataPacket {
  packet: MeshPacket;
  data: DeviceMetadata;
}

export interface WaypointPacket {
  packet: MeshPacket;
  data: Waypoint;
}

export enum EmitterScope {
  "iMeshDevice",
  "iSerialConnection",
  "iNodeSerialConnection",
  "iBleConnection",
  "iHttpConnection",
  "SettingsManager"
}

export enum Emitter {
  "sendText",
  "sendWaypoint",
  "sendPacket",
  "sendRaw",
  "setConfig",
  "setModuleConfig",
  "confirmSetConfig",
  "setOwner",
  "setChannel",
  "confirmSetChannel",
  "deleteChannel",
  "getChannel",
  "getAllChannels",
  "getConfig",
  "getModuleConfig",
  "getOwner",
  "configure",
  "handleFromRadio",
  "handleMeshPacket",
  "connect",
  "ping",
  "readFromRadio",
  "writeToRadio",
  "setDebugMode",
  "getMetadata"
}

export interface LogEvent {
  scope: EmitterScope;
  emitter: Emitter;
  message: string;
  level: LogRecord_Level;
  packet?: Uint8Array;
}
