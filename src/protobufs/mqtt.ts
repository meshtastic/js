import { Field, Message, Type } from "protobufjs";

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
