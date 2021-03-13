import { Field, Message, OneOf, Type } from "protobufjs";

import { Channel } from "./channel";
import { User } from "./mesh";
import { RadioConfig } from "./radioconfig";

/**
 * This message is handled by the Admin plugin and is responsible for all settings/channel read/write operations.
 * This message
is used to do settings operations to both remote AND local nodes.
 */
@Type.d("AdminMessage")
export class AdminMessage extends Message<AdminMessage> {
  @OneOf.d(
    "setRadio",
    "setOwner",
    "setChannel",
    "getRadioRequest",
    "getRadioResponse",
    "getChannelRequest",
    "getChannelResponse"
  )
  variant:
    | "setRadio"
    | "setOwner"
    | "setChannel"
    | "getRadioRequest"
    | "getRadioResponse"
    | "getChannelRequest"
    | "getChannelResponse";

  @Field.d(1, RadioConfig)
  setRadio: RadioConfig;

  @Field.d(2, User)
  setOwner: User;

  @Field.d(3, Channel)
  setChannel: Channel;

  @Field.d(4, "bool")
  getRadioRequest: boolean;

  @Field.d(5, RadioConfig)
  getRadioResponse: RadioConfig;

  @Field.d(6, "uint32")
  getChannelRequest: number;

  @Field.d(7, Channel)
  getChannelResponse: Channel;

  @Field.d(32, "bool")
  confirmSetChannel: boolean;

  @Field.d(33, "bool")
  confirmSetRadio: boolean;
}
