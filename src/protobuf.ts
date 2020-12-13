import { Message, Field, OneOf, Type } from "protobufjs/light";

export enum PortNumEnum {
  UNKNOWN_APP = 0,
  TEXT_MESSAGE_APP = 1,
  REMOTE_HARDWARE_APP = 2,
  POSITION_APP = 3,
  NODEINFO_APP = 4,
  REPLY_APP = 32,
  PRIVATE_APP = 256,
  IP_TUNNEL_APP = 1024,
}

export enum RouteErrorEnum {
  NONE = 0,
  NO_ROUTE = 1,
  GOT_NAK = 2,
  TIMEOUT = 3,
}

export enum ConstantsEnum {
  Unused = 0,
  DATA_PAYLOAD_LEN = 240;
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
  payload: Uint8Array | string;
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
  @OneOf.d(
    "position",
    "data",
    "user",
    "routeRequest",
    "routeReply",
    "routeError"
  )
  payload: Position | Data | User | RouteDiscovery | RouteErrorEnum;

  @OneOf.d("successId", "failId")
  ack: number;

  /**
   * @deprecated
   */
  @Field.d(1, Position)
  position: Position;

  @Field.d(3, Data)
  data: Data;

  /**
   * @deprecated
   */
  @Field.d(4, User)
  user: User;

  @Field.d(6, RouteDiscovery)
  routeRequest: RouteDiscovery;

  @Field.d(7, RouteDiscovery)
  routeReply: RouteDiscovery;

  @Field.d(13, RouteErrorEnum)
  routeError: RouteErrorEnum;

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
  payload: SubPacket | Uint8Array;

  @OneOf.d("successId", "failId")
  ack: string;

  @Field.d(1, "uint32")
  from: number;

  @Field.d(2, "uint32")
  to: number;

  @Field.d(3, SubPacket)
  decoded: SubPacket;

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

  @Field.d(3, "uint32")
  numMissedToFail: number;

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

  @Field.d(7, "uint32")
  errorCode: number;

  @Field.d(8, "uint32")
  errorAddress: number;

  @Field.d(9, "uint32")
  errorCount: number;

  @Field.d(10, "uint32")
  packetIdBits: number;

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
 * This message is never sent over the wire, but it is used for serializing DB
 * state to flash in the device code
 */
@Type.d("DeviceState")
export class DeviceState extends Message<DeviceState> {
  @Field.d(1, RadioConfig)
  radio: RadioConfig;

  @Field.d(2, MyNodeInfo)
  myNode: MyNodeInfo;

  @Field.d(3, User)
  owner: User;

  @Field.d(4, NodeInfo, "repeated")
  nodeDb: NodeInfo;

  @Field.d(5, MeshPacket, "repeated")
  receiveQueue: MeshPacket;

  @Field.d(8, "uint32")
  version: number;

  @Field.d(7, MeshPacket)
  rxTextMessage: MeshPacket;

  @Field.d(9, "bool")
  noSave: boolean;

  @Field.d(11, "bool")
  didGpsReset: boolean;
}

/**
 * Debug output from the device
 */
@Type.d("DebugString")
export class DebugString extends Message<DebugString> {
  @Field.d(1, "string")
  message: "string";
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
    "debugString",
    "configCompleteId",
    "rebooted"
  )
  variant:
    | MeshPacket
    | MyNodeInfo
    | NodeInfo
    | RadioConfig
    | DebugString
    | number
    | boolean;

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

  @Field.d(7, DebugString)
  debugString: DebugString;

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
  @OneOf.d("packet", "wantConfigId", "setRadio", "setOwner")
  variant: MeshPacket | number | RadioConfig | User;

  @Field.d(1, MeshPacket)
  packet: MeshPacket;

  @Field.d(100, "uint32")
  wantConfigId: number;

  @Field.d(101, RadioConfig)
  setRadio: RadioConfig;

  @Field.d(102, User)
  setOwner: User;
}

/**
 * Placeholder for data we will eventually set during initial programming.
 * This will allow us to stop having a load for each region.
 */
@Type.d("ManufacturingData")
export class ManufacturingData extends Message<ManufacturingData> {
  @Field.d(1, "uint32")
  fradioFreq: number;

  @Field.d(2, "string")
  hwModel: string;

  @Field.d(3, "string")
  hwVersion: string;

  @Field.d(4, "sint32")
  selftestResult: number;
}
