import type {
  IBLEConnection,
  IHTTPConnection,
  ISerialConnection,
  Protobuf,
} from "./index.js";

export interface IQueueItem {
  id: number;
  data: Uint8Array;
  sent: boolean;
  added: Date;
  promise: Promise<number>;
}

export enum DeviceStatusEnum {
  DEVICE_RESTARTING = 1,
  DEVICE_DISCONNECTED = 2,
  DEVICE_CONNECTING = 3,
  DEVICE_RECONNECTING = 4,
  DEVICE_CONNECTED = 5,
  DEVICE_CONFIGURING = 6,
  DEVICE_CONFIGURED = 7,
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

export type PacketDestination = "broadcast" | "direct";

export interface PacketMetadata<T> {
  id: number;
  rxTime: Date;
  type: PacketDestination;
  from: number;
  to: number;
  channel: ChannelNumber;
  data: T;
}

export enum EmitterScope {
  iMeshDevice = 1,
  iSerialConnection = 2,
  iNodeSerialConnection = 3,
  iBleConnection = 4,
  iHttpConnection = 5,
}

export enum Emitter {
  constructor = 0,
  sendText = 1,
  sendWaypoint = 2,
  sendPacket = 3,
  sendRaw = 4,
  setConfig = 5,
  setModuleConfig = 6,
  confirmSetConfig = 7,
  setOwner = 8,
  setChannel = 9,
  confirmSetChannel = 10,
  clearChannel = 11,
  getChannel = 12,
  getAllChannels = 13,
  getConfig = 14,
  getModuleConfig = 15,
  getOwner = 16,
  configure = 17,
  handleFromRadio = 18,
  handleMeshPacket = 19,
  connect = 20,
  ping = 21,
  readFromRadio = 22,
  writeToRadio = 23,
  setDebugMode = 24,
  getMetadata = 25,
  resetPeers = 26,
  shutdown = 27,
  reboot = 28,
  rebootOTA = 29,
  factoryReset = 30,
}

export interface LogEvent {
  scope: EmitterScope;
  emitter: Emitter;
  message: string;
  level: Protobuf.LogRecord_Level;
  packet?: Uint8Array;
}

export enum ChannelNumber {
  PRIMARY = 1,
  CHANNEL1 = 2,
  CHANNEL2 = 3,
  CHANNEL3 = 4,
  CHANNEL4 = 5,
  CHANNEL5 = 6,
  CHANNEL6 = 7,
  ADMIN = 8,
}

export type ConnectionType =
  | IBLEConnection
  | IHTTPConnection
  | ISerialConnection;

export type ConnectionTypeName = "ble" | "http" | "serial";

export type Destination = number | "self" | "broadcast";

export interface PacketError {
  id: number;
  error: Protobuf.Routing_Error;
}
