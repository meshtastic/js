import { Field, Message, Type } from "protobufjs";

import { ChannelSettings } from "./channel";
import { MeshPacket } from "./mesh";

/**
 * This message wraps a MeshPacket with extra metadata about the sender and how it arrived.
 */
@Type.d("ServiceEnvelope")
export class ServiceEnvelope extends Message<ServiceEnvelope> {
  @Field.d(1, MeshPacket)
  packet: MeshPacket;

  @Field.d(2, "string")
  channelId: string;

  @Field.d(3, "string")
  gatewayId: string;
}

/**
 * This is the most compact possible representation for a set of channels.  It includes only one PRIMARY channel (which must be first) and any SECONDARY channels.  No DISABLED channels are included.
 * This abstraction is used only on the the 'app side' of the world (ie python, javascript and android etc) to show a group of Channels as a (long) URL
 */
@Type.d("ChannelSet")
export class ChannelSet extends Message<ChannelSet> {
  @Field.d(1, ChannelSettings, "repeated")
  settings: ChannelSettings;
}
