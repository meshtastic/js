import { SettingsManager } from "../settingsmanager";
import { default as protobufjs } from "./meshproto";

export class ProtobufHandler {
  constructor() {
    if (SettingsManager.debugMode) {
      console.log("protobufjs loaded and initialized");
      console.log(protobufjs);
    }
  }

  // converts from a protobuf uint8array to protobufjs obj
  static fromProtobuf(
    objectName: string | string[],
    protobufUInt8Array: Uint8Array
  ) {
    let protobufObj: any;

    let protobufType = protobufjs.lookupType(objectName);

    try {
      protobufObj = protobufType.decode(protobufUInt8Array);
    } catch (e) {
      throw new Error(
        "Error in meshtasticjs.ProtobufHandler.fromProtobuf: " + e.message
      );
    }

    return protobufObj;
  }

  // converts from generic obj to protobuf obj & uint8array
  static toProtobuf(protobufTypeName: string | string[], object: any) {
    let protobuf = {
      obj: undefined as any,
      uint8array: undefined as Uint8Array,
    };

    let protobufType = protobufjs.lookupType(protobufTypeName);

    try {
      let errMsg = protobufType.verify(object);
      if (errMsg) {
        throw Error(errMsg);
      }
    } catch (e) {
      throw new Error(
        "Error in meshtasticjs.ProtobufHandler.toProtobuf:" + e.message
      );
    }

    protobuf.obj = protobufType.fromObject(object);
    protobuf.uint8array = protobufType.encode(protobuf.obj).finish();

    return protobuf;
  }

  /**
   * @todo Fix clash between usage of Type & protobuff.Type
   * @param typeString
   */
  static getType(typeString: string | string[]) {
    return protobufjs.lookupTypeOrEnum(typeString) as any;
  }
}
