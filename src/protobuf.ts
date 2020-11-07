import { Message, Field, OneOf, Type } from "protobufjs/light";

export enum TypeEnum {
  OPAQUE = 0,
  CLEAR_TEXT = 1,
  CLEAR_READACK = 2,
}

export enum RouteErrorEnum {
  NONE = 0,
  NO_ROUTE = 1,
  GOT_NAK = 2,
  TIMEOUT = 3,
}

export enum ConstantsEnum {
  Unused = 0,
}

export enum ModemConfig {
  Bw125Cr45Sf128 = 0,
  Bw500Cr45Sf128 = 1,
  Bw31_25Cr48Sf512 = 2,
  Bw125Cr48Sf4096 = 3,
}

export enum RegionCode {
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

export enum GpsOperation {
  GpsOpUnset = 0,
  GpsOpMobile = 2,
  GpsOpTimeOnly = 3,
  GpsOpDisabled = 4,
}

export enum LocationSharing {
  LocUnset = 0,
  LocEnabled = 1,
  LocDisabled = 2,
}

/**
 * Short description
 */
@Type.d("Position")
export class Position extends Message<Position> {
  @Field.d(7, "sint32")
  public latitudeI: number;

  @Field.d(8, "sint32")
  public longitudeI: number;

  @Field.d(3, "int32")
  public altitude: number;

  @Field.d(4, "int32")
  public batteryLevel: number;

  @Field.d(9, "fixed32")
  public time: number;
}

/**
 * Short description
 */
@Type.d("Data")
export class Data extends Message<Data> {
  @Field.d(1, TypeEnum)
  public typ: TypeEnum;

  @Field.d(2, "bytes")
  public payload: Uint8Array;
}

/**
 * Short description
 */
@Type.d("User")
export class User extends Message<User> {
  @Field.d(1, "string")
  public id: string;

  @Field.d(2, "string")
  public longName: string;

  @Field.d(3, "string")
  public shortName: string;

  @Field.d(4, "bytes")
  public macaddr: Uint8Array;
}

/**
 * Short description
 */
@Type.d("RouteDiscovery")
export class RouteDiscovery extends Message<RouteDiscovery> {
  @Field.d(2, "int32", "repeated")
  public route: number;
}

/**
 * Short description
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
  public payload: string;

  @OneOf.d("successId", "failId")
  public ack: string;

  @Field.d(1, Position)
  public position: Position;

  @Field.d(3, Data)
  public data: Data;

  @Field.d(4, User)
  public user: User;

  @Field.d(6, RouteDiscovery)
  public routeRequest: RouteDiscovery;

  @Field.d(7, RouteDiscovery)
  public routeReply: RouteDiscovery;

  @Field.d(13, RouteErrorEnum)
  public routeError: RouteErrorEnum;

  @Field.d(5, "bool")
  public wantResponse: boolean;

  @Field.d(10, "uint32")
  public successId: number;

  @Field.d(11, "uint32")
  public failId: number;

  @Field.d(9, "uint32")
  public dest: number;

  @Field.d(12, "uint32")
  public source: number;

  @Field.d(2, "uint32")
  public originalId: number;
}

/**
 * Short description
 */
@Type.d("MeshPacket")
export class MeshPacket extends Message<MeshPacket> {
  @OneOf.d("decoded", "encrypted")
  public payload: string;

  @OneOf.d("successId", "failId")
  public ack: string;

  @Field.d(1, "uint32")
  public from: number;

  @Field.d(2, "uint32")
  public to: number;

  @Field.d(3, SubPacket)
  public decoded: SubPacket;

  @Field.d(8, "bytes")
  public encrypted: number;

  @Field.d(6, "uint32")
  public id: number;

  @Field.d(9, "fixed32")
  public rxTime: number;

  @Field.d(7, "float")
  public rxSnr: number;

  @Field.d(10, "uint32")
  public hopLimit: number;

  @Field.d(11, "bool")
  public wantAck: boolean;
}

/**
 * Short description
 */
@Type.d("ChannelSettings")
export class ChannelSettings extends Message<ChannelSettings> {
  @Field.d(1, "int32")
  public txPower: number;

  @Field.d(3, ModemConfig)
  public modemConfig: ModemConfig;

  @Field.d(6, "uint32")
  public bandwidth: number;

  @Field.d(7, "uint32")
  public spreadFactor: number;

  @Field.d(8, "uint32")
  public codingRate: number;

  @Field.d(9, "uint32")
  public channelNum: number;

  @Field.d(4, "bytes")
  public psk: Uint8Array;

  @Field.d(5, "string")
  public name: string;
}

/**
 * Short description
 */
@Type.d("UserPreferences")
export class UserPreferences extends Message<UserPreferences> {
  @Field.d(1, "uint32")
  public positionBroadcastSecs: number;

  @Field.d(2, "uint32")
  public sendOwnerInterval: number;

  @Field.d(3, "uint32")
  public numMissedToFail: number;

  @Field.d(4, "uint32")
  public waitBluetoothSecs: number;

  @Field.d(5, "uint32")
  public screenOnSecs: number;

  @Field.d(6, "uint32")
  public phoneTimeoutSecs: number;

  @Field.d(7, "uint32")
  public phoneSdsTimeoutSec: number;

  @Field.d(8, "uint32")
  public meshSdsTimeoutSecs: number;

  @Field.d(9, "uint32")
  public sdsSecs: number;

  @Field.d(10, "uint32")
  public lsSecs: number;

  @Field.d(11, "uint32")
  public minWakeSecs: number;

  @Field.d(12, "string")
  public wifiSsid: string;

  @Field.d(13, "string")
  public wifiPassword: string;

  @Field.d(14, "bool")
  public wifiApMode: boolean;

  @Field.d(15, RegionCode)
  public region: RegionCode;

  @Field.d(37, "bool")
  public isRouter: boolean;

  @Field.d(38, "bool")
  public isLowPower: boolean;

  @Field.d(100, "bool")
  public factoryReset: boolean;

  @Field.d(32, LocationSharing)
  public locationShare: LocationSharing;

  @Field.d(33, GpsOperation)
  public gpsOperation: GpsOperation;

  @Field.d(34, "uint32")
  public gpsUpdateInterval: number;

  @Field.d(36, "uint32")
  public gpsAttemptTime: number;

  @Field.d(103, "uint32", "repeated")
  public ignoreIncoming: number;
}

/**
 * Short description
 */
@Type.d("RadioConfig")
export class RadioConfig extends Message<RadioConfig> {
  @Field.d(1, UserPreferences)
  public preferences: UserPreferences;

  @Field.d(2, ChannelSettings)
  public channelSettings: ChannelSettings;
}

/**
 * Short description
 */
@Type.d("NodeInfo")
export class NodeInfo extends Message<NodeInfo> {
  @Field.d(1, "uint32")
  public num: number;

  @Field.d(2, User)
  public user: User;

  @Field.d(3, Position)
  public position: Position;

  @Field.d(7, "float")
  public snr: number;

  @Field.d(5, "uint32")
  public nextHop: number;
}

/**
 * Short description
 */
@Type.d("MyNodeInfo")
export class MyNodeInfo extends Message<MyNodeInfo> {
  @Field.d(1, "uint32")
  public myNodeNum: number;

  @Field.d(2, "bool")
  public hasGps: boolean;

  @Field.d(3, "int32")
  public numChannels: number;

  @Field.d(4, "string")
  public region: string;

  @Field.d(5, "string")
  public hwModel: string;

  @Field.d(6, "string")
  public firmwareVersion: string;

  @Field.d(7, "uint32")
  public errorCode: number;

  @Field.d(8, "uint32")
  public errorAddress: number;

  @Field.d(9, "uint32")
  public errorCount: number;

  @Field.d(10, "uint32")
  public packetIdBits: number;

  @Field.d(11, "uint32")
  public currentPacketId: number;

  @Field.d(12, "uint32")
  public nodeNumBits: number;

  @Field.d(13, "uint32")
  public messageTimeoutMsec: number;

  @Field.d(14, "uint32")
  public minAppVersion: number;
}

/**
 * Short description
 */
@Type.d("DeviceState")
export class DeviceState extends Message<DeviceState> {
  @Field.d(1, RadioConfig)
  public radio: RadioConfig;

  @Field.d(2, MyNodeInfo)
  public myNode: MyNodeInfo;

  @Field.d(3, User)
  public owner: User;

  @Field.d(4, NodeInfo, "repeated")
  public nodeDb: NodeInfo;

  @Field.d(5, MeshPacket, "repeated")
  public receiveQueue: MeshPacket;

  @Field.d(8, "uint32")
  public version: number;

  @Field.d(7, MeshPacket)
  public rxTextMessage: MeshPacket;

  @Field.d(9, "bool")
  public noSave: boolean;

  @Field.d(11, "bool")
  public didGpsReset: boolean;
}

/**
 * Short description
 */
@Type.d("DebugString")
export class DebugString extends Message<DebugString> {
  @Field.d(1, "string")
  public message: "string";
}

/**
 * Short description
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
  public variant: string;

  @Field.d(1, "uint32")
  public num: number;

  @Field.d(2, MeshPacket)
  public packet: MeshPacket;

  @Field.d(3, MyNodeInfo)
  public myInfo: MyNodeInfo;

  @Field.d(4, NodeInfo)
  public nodeInfo: NodeInfo;

  @Field.d(6, RadioConfig)
  public radio: RadioConfig;

  @Field.d(7, DebugString)
  public debugString: DebugString;

  @Field.d(8, "uint32")
  public configCompleteId: number;

  @Field.d(9, "bool")
  public rebooted: boolean;
}

/**
 * Short description
 */
@Type.d("ToRadio")
export class ToRadio extends Message<ToRadio> {
  @OneOf.d("packet", "wantConfigId", "setRadio", "setOwner")
  public variant: string;

  @Field.d(1, MeshPacket)
  public packet: MeshPacket;

  @Field.d(100, "uint32")
  public wantConfigId: number;

  @Field.d(101, RadioConfig)
  public setRadio: RadioConfig;

  @Field.d(102, User)
  public setOwner: User;
}

/**
 * Short description
 */
@Type.d("ManufacturingData")
export class ManufacturingData extends Message<ManufacturingData> {
  @Field.d(1, "uint32")
  public fradioFreq: number;

  @Field.d(2, "string")
  public hwModel: string;

  @Field.d(3, "string")
  public hwVersion: string;

  @Field.d(4, "sint32")
  public selftestResult: number;
}
