import { Message, Field, Type } from "protobufjs";

/**
 * Used for the environmental measurement plugin
 */
@Type.d("EnvironmentalMeasurement")
export class EnvironmentalMeasurement extends Message<EnvironmentalMeasurement> {
  @Field.d(1, "float")
  temperature: number;

  @Field.d(2, "float")
  relativeHumidity: number;

  @Field.d(3, "float")
  barometricPressure: number;
}
