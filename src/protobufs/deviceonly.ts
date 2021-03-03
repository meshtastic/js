import { Message, Field, Type } from "protobufjs";
import { Channel } from "./channel";
import { MeshPacket, MyNodeInfo, NodeInfo, User } from "./mesh";
import { RadioConfig } from "./radioconfig";

/**
 * This message is never sent over the wire, but it is used for serializing DB
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

  @Field.d(8, "unit32")
  version: number;

  @Field.d(9, "bool")
  noSave: boolean;

  @Field.d(11, "bool")
  didGpsReset: boolean;

  @Field.d(13, Channel, "repeated")
  channels: Channel;
}
