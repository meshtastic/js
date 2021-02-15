/**
 * Current as of Meshtastic-protobufs #0cadaed3953f66cf1edc99d0fa53e4fd5ebf56d6
 */

import { Message, Field, OneOf, Type } from "protobufjs/light";

export enum PriorityEnum {
  UNSET = 0,
  MIN = 1,
  BACKGROUND = 10,
  DEFAULT = 64,
  RELIABLE = 70,
  ACK = 120,
  MAX = 127,
}

export enum PortNumEnum {
  UNKNOWN_APP = 0,
  TEXT_MESSAGE_APP = 1,
  REMOTE_HARDWARE_APP = 2,
  POSITION_APP = 3,
  NODEINFO_APP = 4,
  REPLY_APP = 32,
  IP_TUNNEL_APP = 33,
  SERIAL_APP = 64,
  STORE_FORWARD_APP = 65,
  RANGE_TEST_APP = 66,
  PRIVATE_APP = 256,
  ATAK_FORWARDER = 257,
}

export enum GPIOTypeEnum {
  UNSET = 0,
  WRITE_GPIOS = 1,
  WATCH_GPIOS = 2,
  GPIOS_CHANGED = 3,
  READ_GPIOS = 4,
  READ_GPIOS_REPLY = 5,
}

export enum ErrorReasonEnum {
  NONE = 0,
  NO_ROUTE = 1,
  GOT_NAK = 2,
  TIMEOUT = 3,
  NO_INTERFACE = 4,
  MAX_RETRANSMIT = 5,
}

export enum ConstantsEnum {
  Unused = 0,
  DATA_PAYLOAD_LEN = 240,
}

export enum ModemConfigEnum {
  Bw125Cr45Sf128 = 0,
  Bw500Cr45Sf128 = 1,
  Bw31_25Cr48Sf512 = 2,
  Bw125Cr48Sf4096 = 3,
}

export enum RegionCodeEnum {
  Unset = 0,
  US = 1,
  EU433 = 2,
  EU865 = 3,
  CN = 4,
  JP = 5,
  ANZ = 6,
  KR = 7,
  TW = 8,
}

export enum GpsOperationEnum {
  GpsOpUnset = 0,
  GpsOpMobile = 2,
  GpsOpTimeOnly = 3,
  GpsOpDisabled = 4,
}

export enum LocationSharingEnum {
  LocUnset = 0,
  LocEnabled = 1,
  LocDisabled = 2,
}

export enum ChargeCurrentEnum {
  MAUnset = 0,
  MA100 = 1,
  MA190 = 2,
  MA280 = 3,
  MA360 = 4,
  MA450 = 5,
  MA550 = 6,
  MA630 = 7,
  MA700 = 8,
  MA780 = 9,
  MA880 = 10,
  MA960 = 11,
  MA1000 = 12,
  MA1080 = 13,
  MA1160 = 14,
  MA1240 = 15,
  MA1320 = 16,
}

export enum CriticalErrorCodeEnum {
  None = 0,
  TxWatchdog = 1,
  SleepEnterWait = 2,
  NoRadio = 3,
  Unspecified = 4,
  UBloxInitFailed = 5,
  NoAXP192 = 6,
  InvalidRadioSetting = 7,
  TransmitFailed = 8,
}

export enum LogLevelEnum {
  UNSET = 0,
  CRITICAL = 50,
  ERROR = 40,
  WARNING = 30,
  INFO = 20,
  DEBUG = 10,
  TRACE = 5,
}

/**
 * A GPS Position
 */
@Type.d("Position")
export class Position extends Message<Position> {
  @Field.d(7, "sint32")
  latitudeI: number;

  @Field.d(8, "sint32")
  longitudeI: number;

  @Field.d(3, "int32")
  altitude: number;

  @Field.d(4, "int32")
  batteryLevel: number;

  @Field.d(9, "fixed32")
  time: number;
}

/**
 * A Data message received by another device over the radio
 */
@Type.d("Data")
export class Data extends Message<Data> {
  @Field.d(1, PortNumEnum)
  portnum: PortNumEnum;

  @Field.d(2, "bytes")
  payload: Uint8Array;
}

/**
 * User structure contains owner information
 */
@Type.d("User")
export class User extends Message<User> {
  @Field.d(1, "string")
  id: string;

  @Field.d(2, "string")
  longName: string;

  @Field.d(3, "string")
  shortName: string;

  @Field.d(4, "bytes")
  macaddr: Uint8Array;
}

/**
 * A message used in our Dynamic Source Routing protocol (RFC 4728 based)
 */
@Type.d("RouteDiscovery")
export class RouteDiscovery extends Message<RouteDiscovery> {
  @Field.d(2, "int32", "repeated")
  route: number;
}

/**
 * The payload portion fo a packet, this is the actual bytes that are sent
 * inside a radio packet (because from/to are broken out by the comms library)
 */
@Type.d("SubPacket")
export class SubPacket extends Message<SubPacket> {
  @OneOf.d("data", "routeRequest", "routeReply", "routeError")
  payloadVariant: "data" | "routeRequest" | "routeReply" | "routeError";

  /**
   * @todo verify that this is a string literal, maybe make optional?
   */
  @OneOf.d("successId", "failId")
  ackVariant: "successId" | "failId";

  @Field.d(3, Data)
  data: Data;

  @Field.d(6, RouteDiscovery)
  routeRequest: RouteDiscovery;

  @Field.d(7, RouteDiscovery)
  routeReply: RouteDiscovery;

  @Field.d(13, ErrorReasonEnum)
  errorReason: ErrorReasonEnum;

  /**
   * @deprecated
   */
  @Field.d(1, Position)
  position: Position;

  /**
   * @deprecated
   */
  @Field.d(4, User)
  user: User;

  @Field.d(5, "bool")
  wantResponse: boolean;

  @Field.d(10, "uint32")
  successId: number;

  @Field.d(11, "uint32")
  failId: number;

  @Field.d(9, "uint32")
  dest: number;

  @Field.d(12, "uint32")
  source: number;

  @Field.d(2, "uint32")
  originalId: number;
}

/**
 * A full packet sent/received over the mesh
 * Note: For simplicity reasons (and that we want to keep over the radio packets
 * very small, we now assume that there is only _one_ SubPacket in each
 * MeshPacket).
 */
@Type.d("MeshPacket")
export class MeshPacket extends Message<MeshPacket> {
  @OneOf.d("decoded", "encrypted")
  payloadVariant: "decoded" | "encrypted";

  @Field.d(1, "uint32")
  from: number;

  @Field.d(2, "uint32")
  to: number;

  @Field.d(3, SubPacket)
  decoded: SubPacket;

  @Field.d(4, "uint32")
  channel_index: number;

  @Field.d(8, "bytes")
  encrypted: Uint8Array;

  @Field.d(6, "uint32")
  id: number;

  @Field.d(9, "fixed32")
  rxTime: number;

  @Field.d(7, "float")
  rxSnr: number;

  @Field.d(10, "uint32")
  hopLimit: number;

  @Field.d(11, "bool")
  wantAck: boolean;

  @Field.d(12, PriorityEnum)
  priority: PriorityEnum;
}

/**
 * Contains radio interface settings that are sent to device inside of RadioConfig
 */
@Type.d("ChannelSettings")
export class ChannelSettings extends Message<ChannelSettings> {
  @Field.d(1, "int32")
  txPower: number;

  @Field.d(3, ModemConfigEnum)
  modemConfig: ModemConfigEnum;

  @Field.d(6, "uint32")
  bandwidth: number;

  @Field.d(7, "uint32")
  spreadFactor: number;

  @Field.d(8, "uint32")
  codingRate: number;

  @Field.d(9, "uint32")
  channelNum: number;

  @Field.d(4, "bytes")
  psk: Uint8Array;

  @Field.d(5, "string")
  name: string;

  @Field.d(10, "fixed32")
  id: number;

  @Field.d(16, "bool")
  uplink_enabled: boolean;

  @Field.d(17, "bool")
  downlink_enabled: boolean;
}

/**
 * Contains general preferences that are sent to device inside of RadioConfig
 */
@Type.d("UserPreferences")
export class UserPreferences extends Message<UserPreferences> {
  @Field.d(1, "uint32")
  positionBroadcastSecs: number;

  @Field.d(2, "uint32")
  sendOwnerInterval: number;

  @Field.d(4, "uint32")
  waitBluetoothSecs: number;

  @Field.d(5, "uint32")
  screenOnSecs: number;

  @Field.d(6, "uint32")
  phoneTimeoutSecs: number;

  @Field.d(7, "uint32")
  phoneSdsTimeoutSec: number;

  @Field.d(8, "uint32")
  meshSdsTimeoutSecs: number;

  @Field.d(9, "uint32")
  sdsSecs: number;

  @Field.d(10, "uint32")
  lsSecs: number;

  @Field.d(11, "uint32")
  minWakeSecs: number;

  @Field.d(12, "string")
  wifiSsid: string;

  @Field.d(13, "string")
  wifiPassword: string;

  @Field.d(14, "bool")
  wifiApMode: boolean;

  @Field.d(15, RegionCodeEnum)
  region: RegionCodeEnum;

  @Field.d(16, ChargeCurrentEnum)
  ChargeCurrent: ChargeCurrentEnum;

  @Field.d(37, "bool")
  isRouter: boolean;

  @Field.d(38, "bool")
  isLowPower: boolean;

  @Field.d(39, "bool")
  fixedPosition: boolean;

  @Field.d(100, "bool")
  factoryReset: boolean;

  @Field.d(101, "bool")
  debugLogEnabled: boolean;

  @Field.d(32, LocationSharingEnum)
  locationShare: LocationSharingEnum;

  @Field.d(33, GpsOperationEnum)
  gpsOperation: GpsOperationEnum;

  @Field.d(34, "uint32")
  gpsUpdateInterval: number;

  @Field.d(36, "uint32")
  gpsAttemptTime: number;

  @Field.d(103, "uint32", "repeated")
  ignoreIncoming: number;

  @Field.d(120, "bool")
  serialpluginEnabled: boolean;

  @Field.d(121, "bool")
  serialpluginEcho: boolean;

  @Field.d(122, "uint32")
  serialpluginRxd: number;

  @Field.d(123, "uint32")
  serialpluginTxd: number;

  @Field.d(124, "uint32")
  serialpluginTimeout: number;

  @Field.d(125, "uint32")
  serialpluginMode: number;

  @Field.d(126, "bool")
  extNotificationPluginEnabled: boolean;

  @Field.d(127, "uint32")
  extNotificationPluginOutputMs: number;

  @Field.d(128, "uint32")
  extNotificationPluginOutput: number;

  @Field.d(129, "bool")
  extNotificationPluginActive: boolean;

  @Field.d(130, "bool")
  extNotificationPluginAlertMessage: boolean;

  @Field.d(131, "bool")
  extNotificationPluginAlertBell: boolean;

  @Field.d(132, "bool")
  rangeTestPluginEnabled: boolean;

  @Field.d(133, "uint32")
  rangeTestPluginSender: number;

  @Field.d(134, "bool")
  rangeTestPluginSave: boolean;

  @Field.d(136, "bool")
  storeForwardPluginEnabled: boolean;

  @Field.d(137, "uint32")
  storeForwardPluginRecords: number;
}

/**
 * The entire set of user settable/readable settings for our radio device.
 * Includes both the current channel settings and any preferences the user has
 * set for behavior of their node
 */
@Type.d("RadioConfig")
export class RadioConfig extends Message<RadioConfig> {
  @Field.d(1, UserPreferences)
  preferences: UserPreferences;

  /**
   * @deprecated
   */
  @Field.d(2, ChannelSettings)
  channelSettings: ChannelSettings;
}

/**
 * Full information about a node on the mesh
 */
@Type.d("NodeInfo")
export class NodeInfo extends Message<NodeInfo> {
  @Field.d(1, "uint32")
  num: number;

  @Field.d(2, User)
  user: User;

  @Field.d(3, Position)
  position: Position;

  @Field.d(7, "float")
  snr: number;

  @Field.d(5, "uint32")
  nextHop: number;
}

/**
 * Unique local debugging info for this node.
 * Note: we don't include position or the user info, because that will be
 * sent by the device in a separate User/Position object.
 */
@Type.d("MyNodeInfo")
export class MyNodeInfo extends Message<MyNodeInfo> {
  @Field.d(1, "uint32")
  myNodeNum: number;

  @Field.d(2, "bool")
  hasGps: boolean;

  @Field.d(3, "int32")
  numChannels: number;

  @Field.d(4, "string")
  region: string;

  @Field.d(5, "string")
  hwModel: string;

  @Field.d(6, "string")
  firmwareVersion: string;

  @Field.d(7, CriticalErrorCodeEnum)
  errorCode: CriticalErrorCodeEnum;

  @Field.d(8, "uint32")
  errorAddress: number;

  @Field.d(9, "uint32")
  errorCount: number;

  @Field.d(10, "uint32")
  packetIdBits: number;

  /**
   * @deprecated
   */
  @Field.d(11, "uint32")
  currentPacketId: number;

  @Field.d(12, "uint32")
  nodeNumBits: number;

  @Field.d(13, "uint32")
  messageTimeoutMsec: number;

  @Field.d(14, "uint32")
  minAppVersion: number;
}

/**
 * Debug output from the device.
 */
@Type.d("LogRecord")
export class LogRecord extends Message<LogRecord> {
  //log levels
  @Field.d(1, "string")
  message: string;

  @Field.d(2, "fixed32")
  time: number;

  @Field.d(3, "string")
  source: string;

  @Field.d(4, LogLevelEnum)
  level: LogLevelEnum;
}

/**
 * Packets from the radio to the client will have this type
 */
@Type.d("FromRadio")
export class FromRadio extends Message<FromRadio> {
  @OneOf.d(
    "packet",
    "myInfo",
    "nodeInfo",
    "radio",
    "logRecord",
    "configCompleteId",
    "rebooted",
    "channel"
  )
  payloadVariant:
    | "packet"
    | "myInfo"
    | "nodeInfo"
    | "radio"
    | "logRecord"
    | "configCompleteId"
    | "rebooted"
    | "channel";

  @Field.d(1, "uint32")
  num: number;

  @Field.d(2, MeshPacket)
  packet: MeshPacket;

  @Field.d(3, MyNodeInfo)
  myInfo: MyNodeInfo;

  @Field.d(4, NodeInfo)
  nodeInfo: NodeInfo;

  @Field.d(6, RadioConfig)
  radio: RadioConfig;

  @Field.d(7, LogRecord)
  logRecord: LogRecord;

  @Field.d(8, "uint32")
  configCompleteId: number;

  @Field.d(9, "bool")
  rebooted: boolean;

  @Field.d(10, ChannelSettings)
  channel: ChannelSettings;
}

/**
 * Packets from the client to the radio will have this type
 */
@Type.d("ToRadio")
export class ToRadio extends Message<ToRadio> {
  @OneOf.d("packet", "wantConfigId", "setRadio", "setOwner", "setChannel")
  payloadVariant:
    | "packet"
    | "wantConfigId"
    | "setRadio"
    | "setOwner"
    | "setChannel";

  @Field.d(1, MeshPacket)
  packet: MeshPacket;

  @Field.d(100, "uint32")
  wantConfigId: number;

  @Field.d(101, RadioConfig)
  setRadio: RadioConfig;

  @Field.d(102, User)
  setOwner: User;

  @Field.d(103, ChannelSettings)
  setChannel: ChannelSettings;
}

/**
 * Provides easy remote access to any GPIO.
 */
@Type.d("HardwareMessage")
export class HardwareMessage extends Message<HardwareMessage> {
  @Field.d(1, GPIOTypeEnum)
  typ: GPIOTypeEnum;

  @Field.d(2, "uint64")
  gpioMask: number;

  @Field.d(3, "uint64")
  gpioValue: number;
}
