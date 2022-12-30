import type {
  IBLEConnection,
  IHTTPConnection,
  ISerialConnection,
  Protobuf
} from "./index.js";

export enum DeviceStatusEnum {
  DEVICE_RESTARTING,
  DEVICE_DISCONNECTED,
  DEVICE_CONNECTING,
  DEVICE_RECONNECTING,
  DEVICE_CONNECTED,
  DEVICE_CONFIGURING,
  DEVICE_CONFIGURED
}

export type ConnectionParameters =
  | HTTPConnectionParameters
  | BLEConnectionParameters
  | SerialConnectionParameters;

export interface HTTPConnectionParameters {
  /** Address The IP Address/Domain to connect to, without protocol */
  address: string;
  /**
   * Enables transport layer security. Notes: Slower, devices' certificate must
   * be trusted by the browser
   */
  tls?: boolean;
  /** Enables receiving messages all at once, versus one per request */
  receiveBatchRequests?: boolean;
  /**
   * (ms) Sets a fixed interval in that the device is fetched for new messages,
   * defaults to 5 seconds
   */
  fetchInterval: number;
}

export interface BLEConnectionParameters {
  /** Optional filter options for the web bluetooth api requestDevice() method */
  deviceFilter?: RequestDeviceOptions;
  /** Connect directly to a Bluetooth deivce, obtained from `getDevices()` */
  device?: BluetoothDevice;
}

export interface SerialConnectionParameters {
  baudRate?: number;
  /** Connect directly to a Serial port, obtained from `getPorts()` */
  port?: SerialPort;
  concurrentLogOutput: boolean;
}

export type LogEventPacket = LogEvent & { date: Date };

export interface NodeInfoPacket {
  packet: Protobuf.MeshPacket;
  data: Protobuf.NodeInfo;
}

export interface UserPacket {
  packet: Protobuf.MeshPacket;
  data: Protobuf.User;
}

export interface RoutingPacket {
  packet: Protobuf.MeshPacket;
  data: Protobuf.Routing;
}

export interface PositionPacket {
  packet: Protobuf.MeshPacket;
  data: Protobuf.Position;
}

export interface MessagePacket {
  packet: Protobuf.MeshPacket;
  text: string;
}

export interface PingPacket {
  packet: Protobuf.MeshPacket;
  data: Uint8Array;
}

export interface IpTunnelPacket {
  packet: Protobuf.MeshPacket;
  data: Uint8Array;
}

export interface SerialPacket {
  packet: Protobuf.MeshPacket;
  data: Uint8Array;
}

export interface StoreForwardPacket {
  packet: Protobuf.MeshPacket;
  data: Uint8Array;
}

export interface RangeTestPacket {
  packet: Protobuf.MeshPacket;
  data: Uint8Array;
}

export interface TelemetryPacket {
  packet: Protobuf.MeshPacket;
  data: Protobuf.Telemetry;
}

export interface PrivatePacket {
  packet: Protobuf.MeshPacket;
  data: Uint8Array;
}

export interface AtakPacket {
  packet: Protobuf.MeshPacket;
  data: Uint8Array;
}

export interface RemoteHardwarePacket {
  packet: Protobuf.MeshPacket;
  data: Protobuf.HardwareMessage;
}

export interface ChannelPacket {
  packet: Protobuf.MeshPacket;
  data: Protobuf.Channel;
}

export interface ConfigPacket {
  packet: Protobuf.MeshPacket;
  data: Protobuf.Config;
}

export interface ModuleConfigPacket {
  packet: Protobuf.MeshPacket;
  data: Protobuf.ModuleConfig;
}

export interface DeviceMetadataPacket {
  packet: Protobuf.MeshPacket;
  data: Protobuf.DeviceMetadata;
}

export interface WaypointPacket {
  packet: Protobuf.MeshPacket;
  data: Protobuf.Waypoint;
}

export enum EmitterScope {
  "iMeshDevice",
  "iSerialConnection",
  "iNodeSerialConnection",
  "iBleConnection",
  "iHttpConnection"
}

export enum Emitter {
  "constructor",
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
  "clearChannel",
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
  "getMetadata",
  "resetPeers",
  "shutdown",
  "reboot",
  "rebootOTA",
  "factoryReset"
}

export interface LogEvent {
  scope: EmitterScope;
  emitter: Emitter;
  message: string;
  level: Protobuf.LogRecord_Level;
  packet?: Uint8Array;
}

export enum ChannelNumber {
  PRIMARY,
  CHANNEL1,
  CHANNEL2,
  CHANNEL3,
  CHANNEL4,
  CHANNEL5,
  CHANNEL6,
  ADMIN
}

export type ConnectionType =
  | IBLEConnection
  | IHTTPConnection
  | ISerialConnection;

export type destination = number | "self" | "broadcast";

export type callback = (id: number) => Promise<void>;

export interface sendTextProps {
  text: string;
  destination?: destination;
  wantAck?: boolean;
  channel?: ChannelNumber;
  callback: callback;
}
export interface sendWaypointProps {
  waypoint: Protobuf.Waypoint;
  destination: destination;
  channel?: ChannelNumber;
  callback?: callback;
}
export interface sendPacketProps {
  byteData: Uint8Array;
  portNum: Protobuf.PortNum;
  destination: destination;
  wantAck?: boolean;
  channel?: ChannelNumber;
  wantResponse?: boolean;
  echoResponse?: boolean;
  callback?: callback;
  emoji?: number;
  replyId?: number;
}
export interface sendRawProps {
  id: number;
  toRadio: Uint8Array;
  callback?: callback;
}
export interface setConfigProps {
  config: Protobuf.Config;
  callback?: callback;
}
export interface setModuleConfigProps {
  moduleConfig: Protobuf.ModuleConfig;
  callback?: callback;
}
export interface setOwnerProps {
  owner: Protobuf.User;
  callback?: callback;
}
export interface setChannelProps {
  channel: Protobuf.Channel;
  callback?: callback;
}
export interface setPositionProps {
  position: Protobuf.Position;
  callback?: callback;
}
export interface getChannelProps {
  index: number;
  callback?: callback;
}
export interface getConfigProps {
  configType: Protobuf.AdminMessage_ConfigType;
  callback?: callback;
}
export interface getModuleConfigProps {
  moduleConfigType: Protobuf.AdminMessage_ModuleConfigType;
  callback?: callback;
}
export interface getOwnerProps {
  callback?: callback;
}
export interface getMetadataProps {
  nodeNum: number;
  callback?: callback;
}
export interface clearChannelProps {
  index: number;
  callback?: callback;
}
export interface confirmSetChannelProps {
  callback?: callback;
}
export interface confirmSetConfigProps {
  callback?: callback;
}
export interface resetPeersProps {
  callback?: callback;
}
export interface factoryResetProps {
  callback?: callback;
}
export interface traceRouteProps {
  destination: number;
  callback?: callback;
}
export interface requestPositionProps {
  destination: number;
  callback?: callback;
}
export interface shutdownProps {
  time: number;
  callback?: callback;
}
export interface rebootProps {
  time: number;
  callback?: callback;
}
export interface rebootOTAProps {
  time: number;
  callback?: callback;
}
export interface updateDeviceStatusProps {
  status: DeviceStatusEnum;
}
export interface handleFromRadioProps {
  fromRadio: Uint8Array;
}
export interface handleDataPacketProps {
  dataPacket: Protobuf.Data;
  meshPacket: Protobuf.MeshPacket;
}
