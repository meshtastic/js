import { Field, Message, Type } from "protobufjs";

import { Channel } from "./channel";
import { MeshPacket, MyNodeInfo, NodeInfo, User } from "./mesh";
import { RegionCodeEnum } from "./radioconfig";

/**
 * This is a stub version of the old 1.1 representation of RadioConfig.
 * But only keeping the region info.
 * The device firmware uses this stub while migrating old nodes to the new preferences system.
 */
@Type.d("LegacyPreferences")
export class LegacyPreferences extends Message<LegacyPreferences> {
  @Field.d(15, RegionCodeEnum)
  region: RegionCodeEnum;
}

/**
 * This is a stub version of the old 1.1 representation of RadioConfig.
 * But only keeping the region info.
 * The device firmware uses this stub while migrating old nodes to the new preferences system.
 */
@Type.d("LegacyRadioConfig")
export class LegacyRadioConfig extends Message<LegacyRadioConfig> {
  @Field.d(1, LegacyPreferences)
  preferences: LegacyPreferences;
}

/**
 * This message is never sent over the wire, but it is used for serializing DB
 */
@Type.d("DeviceState")
export class DeviceState extends Message<DeviceState> {
  @Field.d(2, MyNodeInfo)
  myNode: MyNodeInfo;

  @Field.d(3, User)
  owner: User;

  @Field.d(4, NodeInfo, "repeated")
  nodeDb: NodeInfo;

  @Field.d(5, MeshPacket, "repeated")
  receiveQueue: MeshPacket;

  @Field.d(8, "unit32")
  version: number;

  @Field.d(9, "bool")
  noSave: boolean;

  @Field.d(11, "bool")
  didGpsReset: boolean;

  @Field.d(13, Channel, "repeated")
  channels: Channel;
}

/**
 * The on-disk saved channels
 */
@Type.d("ChannelFile")
export class ChannelFile extends Message<ChannelFile> {
  @Field.d(1, Channel, "repeated")
  channels: Channel;
}
