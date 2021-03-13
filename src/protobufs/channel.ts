import { Field, Message, Type } from "protobufjs";

export enum ModemConfigEnum {
  Bw125Cr45Sf128 = 0,
  Bw500Cr45Sf128 = 1,
  Bw31_25Cr48Sf512 = 2,
  Bw125Cr48Sf4096 = 3
}

/**
 * Full settings (center freq, spread factor, pre-shared secret key etc...)
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

export enum RoleEnum {
  DISABLED = 0,
  PRIMARY = 1,
  SECONDARY = 2
}

/**
 * How this channel is being used (or not).
 */
@Type.d("Channel")
export class Channel extends Message<Channel> {
  @Field.d(1, "int32")
  index: number;

  @Field.d(2, ChannelSettings)
  settings: ChannelSettings;

  @Field.d(3, RoleEnum)
  role: RoleEnum;
}
