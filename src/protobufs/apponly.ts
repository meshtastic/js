import { Field, Message, Type } from "protobufjs";

import { ChannelSettings } from "./channel";

/**
 * This is the most compact possible representation for a set of channels.  It includes only one PRIMARY channel (which must be first) and any SECONDARY channels.  No DISABLED channels are included.
 * This abstraction is used only on the the 'app side' of the world (ie python, javascript and android etc) to show a group of Channels as a (long) URL
 */
@Type.d("ChannelSet")
export class ChannelSet extends Message<ChannelSet> {
  @Field.d(1, ChannelSettings, "repeated")
  settings: ChannelSettings;
}
