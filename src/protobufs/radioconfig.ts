import { Field, Message, Type } from "protobufjs";

export enum RegionCodeEnum {
  Unset = 0,
  US = 1,
  EU433 = 2,
  EU865 = 3,
  CN = 4,
  JP = 5,
  ANZ = 6,
  KR = 7,
  TW = 8
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
  MA1320 = 16
}

export enum GpsOperationEnum {
  GpsOpUnset = 0,
  GpsOpMobile = 2,
  GpsOpTimeOnly = 3,
  GpsOpDisabled = 4
}

export enum LocationSharingEnum {
  LocUnset = 0,
  LocEnabled = 1,
  LocDisabled = 2
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

  @Field.d(40, "bool")
  serialDisabled: boolean;

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

  @Field.d(41, "float")
  frequencyOffset: number;

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

  @Field.d(148, "bool")
  storeForwardPluginEnabled: boolean;

  @Field.d(137, "uint32")
  storeForwardPluginRecords: number;

  @Field.d(140, "bool")
  environmentalMeasurementPluginMeasurementEnabled: boolean;

  @Field.d(141, "bool")
  environmentalMeasurementPluginScreenEnabled: boolean;

  @Field.d(142, "uint32")
  environmentalMeasurementPluginReadErrorCountThreshold: number;

  @Field.d(143, "uint32")
  environmentalMeasurementPluginUpdateInterval: number;

  @Field.d(144, "uint32")
  environmentalMeasurementPluginRecoveryInterval: number;
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
}
