import { Field, Message, OneOf, Type } from "protobufjs";

import { PortNumEnum } from "./portnums";

/**
 * A GPS Position
 */
@Type.d("Position")
export class Position extends Message<Position> {
  @Field.d(1, "sfixed32")
  latitudeI: number;

  @Field.d(2, "sfixed32")
  longitudeI: number;

  @Field.d(3, "int32")
  altitude: number;

  @Field.d(4, "int32")
  batteryLevel: number;

  @Field.d(9, "fixed32")
  fixed32: number;
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
  @Field.d(2, "fixed32", "repeated")
  route: number;
}

export enum ErrorEnum {
  NONE = 0,
  NO_ROUTE = 1,
  GOT_NAK = 2,
  TIMEOUT = 3,
  NO_INTERFACE = 4,
  MAX_RETRANSMIT = 5,
  NO_CHANNEL = 6,
  TOO_LARGE = 7,
  NO_RESPONSE = 8
}

/**
 * A Routing control Data packet handled by the routing plugin
 */
@Type.d("Routing")
export class Routing extends Message<Routing> {
  @OneOf.d("data", "routeRequest", "routeReply", "routeError")
  payloadVariant: "data" | "routeRequest" | "routeReply" | "routeError";

  @Field.d(1, RouteDiscovery)
  routeRequest: RouteDiscovery;

  @Field.d(2, RouteDiscovery)
  routeReply: RouteDiscovery;

  @Field.d(3, ErrorEnum)
  errorReason: ErrorEnum;
}

/**
 * The payload portion fo a packet, this is the actual bytes that are sent
 * inside a radio packet (because from/to are broken out by the comms library)
 */
@Type.d("Data")
export class Data extends Message<Data> {
  @Field.d(1, PortNumEnum)
  portnum: PortNumEnum;

  @Field.d(2, "bytes")
  payload: Uint8Array;

  @Field.d(3, "bool")
  wantResponse: boolean;

  @Field.d(4, "fixed32")
  dest: number;

  @Field.d(5, "fixed32")
  source: number;

  @Field.d(6, "fixed32")
  requestId: number;
}

export enum PriorityEnum {
  UNSET = 0,
  MIN = 1,
  BACKGROUND = 10,
  DEFAULT = 64,
  RELIABLE = 70,
  ACK = 120,
  MAX = 127
}

/**
 * The priority of this message for sending.  Higher priorities are sent first
  (when managing the transmit queue).
 */

@Type.d("MeshPacket")
export class MeshPacket extends Message<MeshPacket> {
  @Field.d(1, "fixed32")
  from: number;

  @Field.d(2, "fixed32")
  to: number;

  @Field.d(3, "uint32")
  channel: number;

  @OneOf.d("decoded", "encrypted")
  payloadVariant: "decoded" | "encrypted";

  @Field.d(4, Data)
  decoded: Data;

  @Field.d(5, "bytes")
  encrypted: Uint8Array;

  @Field.d(6, "fixed32")
  id: number;

  @Field.d(7, "fixed32")
  rxTime: number;

  @Field.d(8, "float")
  rxSnr: number;

  @Field.d(10, "uint32")
  hopLimit: number;

  @Field.d(11, "bool")
  wantAck: boolean;

  @Field.d(12, PriorityEnum)
  priority: PriorityEnum;
}

export enum ConstantsEnum {
  Unused = 0,
  DATA_PAYLOAD_LEN = 240
}

/**
 * Note: these enum names must EXACTLY match the string used in the device
 * bin/build-all.sh script.  Because they will be used to find firmware filenames
 * in the android app for OTA updates.
 * To match the old style filenames, _ is converted to -, p is converted to .
 */
export enum HardwareModel {
  UNSET = 0,
  TLORA_V2 = 1,
  TLORA_V1 = 2,
  TLORA_V2_1_1p6 = 3,
  TBEAM = 4,
  HELTEC = 5,
  TBEAM0p7 = 6,
  T_ECHO = 7,
  TLORA_V1_1p3 = 8,
  LORA_RELAY_V1 = 32,
  NRF52840DK = 33,
  PPR = 34,
  GENIEBLOCKS = 35,
  NRF52_UNKNOWN = 36,
  PORTDUINO = 37
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

  @Field.d(6, HardwareModel)
  hwModel: HardwareModel;
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
  Brownout = 9
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

  @Field.d(3, "uint32")
  numBands: number;

  @Field.d(15, "uint32")
  maxChannels: number;

  /**
   * @deprecated
   */
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

  @Field.d(13, "uint32")
  messageTimeoutMsec: number;

  @Field.d(14, "uint32")
  minAppVersion: number;
}

export enum LogLevelEnum {
  UNSET = 0,
  CRITICAL = 50,
  ERROR = 40,
  WARNING = 30,
  INFO = 20,
  DEBUG = 10,
  TRACE = 5
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
 * Packets from the radio to the phone will appear on the fromRadio characteristic.
 */
@Type.d("FromRadio")
export class FromRadio extends Message<FromRadio> {
  @Field.d(1, "uint32")
  num: number;

  @OneOf.d(
    "packet",
    "myInfo",
    "nodeInfo",
    "logRecord",
    "configCompleteId",
    "rebooted"
  )
  payloadVariant:
    | "packet"
    | "myInfo"
    | "nodeInfo"
    | "logRecord"
    | "configCompleteId"
    | "rebooted";

  @Field.d(11, MeshPacket)
  packet: MeshPacket;

  @Field.d(3, MyNodeInfo)
  myInfo: MyNodeInfo;

  @Field.d(4, NodeInfo)
  nodeInfo: NodeInfo;

  @Field.d(7, LogRecord)
  logRecord: LogRecord;

  @Field.d(8, "uint32")
  configCompleteId: number;

  @Field.d(9, "bool")
  rebooted: boolean;
}

/**
 * Packets from the client to the radio will have this type
 */
@Type.d("ToRadio")
export class ToRadio extends Message<ToRadio> {
  @OneOf.d("packet", "wantConfigId")
  payloadVariant: "packet" | "wantConfigId";

  @Field.d(2, MeshPacket)
  packet: MeshPacket;

  @Field.d(100, "uint32")
  wantConfigId: number;
}
