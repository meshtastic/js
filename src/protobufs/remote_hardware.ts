import { Message, Field, Type } from "protobufjs";

export enum GPIOTypeEnum {
  UNSET = 0,
  WRITE_GPIOS = 1,
  WATCH_GPIOS = 2,
  GPIOS_CHANGED = 3,
  READ_GPIOS = 4,
  READ_GPIOS_REPLY = 5,
}

/**
 * Provides easy remote access to any GPIO.
 */
@Type.d("HardwareMessage")
export class HardwareMessage extends Message<HardwareMessage> {
  @Field.d(1, GPIOTypeEnum)
  typ: GPIOTypeEnum;

  @Field.d(2, "uint64")
  gpioMask: number;

  @Field.d(3, "uint64")
  gpioValue: number;
}
