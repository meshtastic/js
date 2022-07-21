import type {
  IBLEConnection,
  IHTTPConnection,
  ISerialConnection,
  Protobuf
} from "./index.js";
import type {
  MeshPacket,
  NodeInfo,
  Position,
  Routing,
  User
} from "./generated/mesh.js";

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

export interface TextPacket {
  packet: MeshPacket;
  data: string;
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
  data: Protobuf.Telemetry;
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
  data: Protobuf.HardwareMessage;
}

export interface ChannelPacket {
  packet: MeshPacket;
  data: Protobuf.Channel;
}

export interface ConfigPacket {
  packet: MeshPacket;
  data: Protobuf.Config;
}

export interface ModuleConfigPacket {
  packet: MeshPacket;
  data: Protobuf.ModuleConfig;
}

export enum EmitterScope {
  "iMeshDevice",
  "iSerialConnection",
  "iConsoleSerialConnection",
  "iBleConnection",
  "iHttpConnection",
  "SettingsManager"
}

export enum Emitter {
  "sendText",
  "sendLocation",
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
  "setDebugMode"
}

export interface LogEvent {
  scope: EmitterScope;
  emitter: Emitter;
  message: string;
  level: Protobuf.LogRecord_Level;
  packet?: Uint8Array;
}
