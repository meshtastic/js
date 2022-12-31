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

export interface PacketMetadata<T> {
  id: number;
  rxTime: Date;
  from: number;
  channel: ChannelNumber;
  data: T;
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

export interface PacketError {
  id: number;
  error: Protobuf.Routing_Error;
}

export interface sendTextProps {
  text: string;
  destination?: destination;
  wantAck?: boolean;
  channel?: ChannelNumber;
}
export interface sendWaypointProps {
  waypoint: Protobuf.Waypoint;
  destination: destination;
  channel?: ChannelNumber;
}
export interface sendPacketProps {
  byteData: Uint8Array;
  portNum: Protobuf.PortNum;
  destination: destination;
  wantAck?: boolean;
  channel?: ChannelNumber;
  wantResponse?: boolean;
  echoResponse?: boolean;
  emoji?: number;
  replyId?: number;
}
export interface sendRawProps {
  id: number;
  toRadio: Uint8Array;
}
export interface setConfigProps {
  config: Protobuf.Config;
}
export interface setModuleConfigProps {
  moduleConfig: Protobuf.ModuleConfig;
}
export interface setOwnerProps {
  owner: Protobuf.User;
}
export interface setChannelProps {
  channel: Protobuf.Channel;
}
export interface setPositionProps {
  position: Protobuf.Position;
}
export interface getChannelProps {
  index: number;
}
export interface getConfigProps {
  configType: Protobuf.AdminMessage_ConfigType;
}
export interface getModuleConfigProps {
  moduleConfigType: Protobuf.AdminMessage_ModuleConfigType;
}
export interface getMetadataProps {
  nodeNum: number;
}
export interface clearChannelProps {
  index: number;
}
export interface traceRouteProps {
  destination: number;
}
export interface requestPositionProps {
  destination: number;
}
export interface shutdownProps {
  time: number;
}
export interface rebootProps {
  time: number;
}
export interface rebootOTAProps {
  time: number;
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
