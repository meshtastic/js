import { SettingsManager } from "./settingsmanager.js"
import { Root as protobufjs } from "../node_modules/protobufjs/index.js"


export class ProtobufHandler {

    /******************
    static var instance    # singleton obj reference   
    var protobufjs         # protobufjs reference
    *******************/

    constructor() {

        if (ProtobufHandler.instance !== undefined) {
            return ProtobufHandler.instance;
        } 
        ProtobufHandler.instance = this;


        let protobufJSONData = require('../proto/meshproto.json');

        try {
            this.protobufjs = protobufjs.fromJSON(protobufJSONData);
        }
        catch (e) {
            throw new Error('Error in meshtasticjs.ProtobufHandler init: ' + e.message);
        }

        // FIXME debug mode global var?
        if (SettingsManager.debugMode) { console.log('protobufjs loaded and initialized'); console.log(this.protobufjs); }

    }


    // converts from a protobuf uint8array to protobufjs obj
    fromProtobuf(objectName, protobufUInt8Array) {

        var protobufObj;

        let protobufType = this.protobufjs.lookupType(objectName);

        try {
            protobufObj = protobufType.decode(protobufUInt8Array); 
        } catch (e) {
            throw new Error('Error in meshtasticjs.ProtobufHandler.fromProtobuf: ' + e.message);
        }
            
        return protobufObj;
    }


    // converts from generic obj to protobuf obj & uint8array
    toProtobuf(protobufTypeName, object) {

        var protobuf = {
            obj: undefined,
            uint8array: undefined
        };
        
        let protobufType = this.protobufjs.lookupType(protobufTypeName);

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


    getType(typeString) {

        return this.protobufjs.lookupTypeOrEnum(typeString);

    }


}