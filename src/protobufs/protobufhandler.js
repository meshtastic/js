import { SettingsManager } from "../settingsmanager.js"
import { default as protobufjs } from "./meshproto.js"


export class ProtobufHandler {


    constructor() {

        if (SettingsManager.debugMode) { console.log('protobufjs loaded and initialized'); console.log(protobufjs); }

    }


    // converts from a protobuf uint8array to protobufjs obj
    static fromProtobuf(objectName, protobufUInt8Array) {

        var protobufObj;

        let protobufType = protobufjs.lookupType(objectName);

        try {
            protobufObj = protobufType.decode(protobufUInt8Array); 
        } catch (e) {
            throw new Error('Error in meshtasticjs.ProtobufHandler.fromProtobuf: ' + e.message);
        }
            
        return protobufObj;
    }


    // converts from generic obj to protobuf obj & uint8array
    static toProtobuf(protobufTypeName, object) {
        
        var protobuf = {
            obj: undefined,
            uint8array: undefined
        };
        
        let protobufType = protobufjs.lookupType(protobufTypeName);

        try {
            let errMsg = protobufType.verify(object);
            if (errMsg) {
                throw Error(errMsg);
            }
        } catch (e) {
            throw new Error('Error in meshtasticjs.ProtobufHandler.toProtobuf:' + e.message);
        }

        protobuf.obj = protobufType.fromObject(object);
        protobuf.uint8array = protobufType.encode(protobuf.obj).finish();


        return protobuf;
    }


    static getType(typeString) {

        return protobufjs.lookupTypeOrEnum(typeString);

    }


}