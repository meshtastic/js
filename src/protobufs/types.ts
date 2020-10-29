export interface Position {
  latitudeI: number;
  longitudeI: number;
  altitude: number;
  batteryLevel?: number;
  time: any /** @todo get correct type */;
}

export interface Data {
  typ: Type;
  payload: Uint8Array;
}

export enum Type {
  OPAQUE = 0,
  CLEAR_TEXT = 1,
  CLEAR_READACK = 2,
}

export interface User {
  id: string;
  longName: string;
  shortName: string;
  macaddr: any /** @todo get correct type */;
}

export interface RouteDiscovery {
  route: number;
}

export enum RouteError {
  NONE = 0,
  NO_ROUTE = 1,
  GOT_NAK = 2,
  TIMEOUT = 3,
}

export interface SubPacket {
  position?: Position;
  data?: Data;
  user?: User;
  routeRequest?: RouteDiscovery;
  routeReply?: RouteDiscovery;
  routeError?: RouteError;
  wantResponse: boolean;
  successId?: number;
  failId?: number;
  dest: number;
  source: number;
  originalId: number;
}

export interface MeshPacket {
  from: number;
  to: number;
  decoded?: SubPacket;
  encrypted?: any /** @todo get correct type */;
  id: number;
  rxTime: number;
  rxSnr: number;
  hopLimit: number;
  wantAck: boolean;
}

export enum Constants {
  Unused = 0,
}

export enum ModemConfig {
  Bw125Cr45Sf128 = 0,
  Bw500Cr45Sf128 = 1,
  Bw31_25Cr48Sf512 = 2,
  Bw125Cr48Sf4096 = 3,
}

export interface ChannelSettings {
  txPower: number;
  modemConfig: ModemConfig;
  bandwidth: number;
  spreadFactor: number;
  codingRate: number;
  channelNum: number;
  psk: any /** @todo get correct type */;
  name: string;
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

export interface RadioConfig {
  preferences: UserPreferences;
  channelSettings: ChannelSettings;
}

export interface UserPreferences {
  positionBroadcastSecs: number;
  sendOwnerInterval: number;
  numMissedToFail: number;
  waitBluetoothSecs: number;
  screenOnSecs: number;
  phoneTimeoutSecs: number;
  phoneSdsTimeoutSec: number;
  meshSdsTimeoutSecs: number;
  sdsSecs: number;
  lsSecs: number;
  minWakeSecs: number;
  wifiSsid: string;
  wifiPassword: string;
  wifiApMode: boolean;
  region: RegionCode;
  isRouter: boolean;
  isLowPower: boolean;
  factoryReset: boolean;
  locationShare: LocationSharing;
  gpsOperation: GpsOperation;
  gpsUpdateInterval: number;
  gpsAttemptTime: number;
  ignoreIncoming: number;
}

export interface NodeInfo {
  num: number;
  user: User;
  position: Position;
  snr: number;
  nextHop: number;
}

export interface MyNodeInfo {
  myNodeNum: number;
  hasGps: boolean;
  numChannels: number;
  region: string;
  hwModel: string;
  firmwareVersion: string;
  errorCode: number;
  errorAddress: number;
  errorCount: number;
  packetIdBits: number;
  currentPacketId: number;
  nodeNumBits: number;
  messageTimeoutMsec: number;
  minAppVersion: number;
}

export interface DeviceState {
  radio: RadioConfig;
  myNode: MyNodeInfo;
  owner: User;
  nodeDb: NodeInfo;
  receiveQueue: MeshPacket;
  version: number;
  rxTextMessage: MeshPacket;
  noSave: boolean;
  didGpsReset: boolean;
}

export interface DebugString {
  message: string;
}

export interface FromRadio {
  num: number;
  packet?: MeshPacket;
  myInfo?: MyNodeInfo;
  nodeInfo?: NodeInfo;
  radio?: RadioConfig;
  debugString?: DebugString;
  configCompleteId?: number;
  rebooted?: boolean;
}

export interface ToRadio {
  packet?: MeshPacket;
  wantConfigId?: number;
  setRadio?: RadioConfig;
  setOwner?: User;
}

export interface ManufacturingData {
  fradioFreq: number;
  hwModel: string;
  hwVersion: string;
  selftestResult: number;
}
