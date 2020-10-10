import * as constants from "./constants.js"
import { SettingsManager } from "./settingsmanager.js"
import { ProtobufHandler } from "./protobufhandler.js"

export class NodeDB extends EventTarget {
    
    /******************
    var nodes;
    var protobufHandler;
    *******************/

    constructor() {

        super();

        this.nodes = new Map();
        this.protobufHandler = new ProtobufHandler();

    }

    addNode(nodeInfo) {

        this.nodes.set(nodeInfo.num, nodeInfo);
        this._dispatchInterfaceEvent('nodeListChanged', nodeInfo.num);
        return nodeInfo.num;

    }

    addUserData(nodeNumber, user) {

        let node = this.nodes.get(nodeNumber);

        if (node === undefined) {

            let nodeInfo = {
                num: nodeNumber,
                position: {},
                user: user
            }

            try {
                this.nodes.set(nodeNumber, protobufHandler.toProtobuf('NodeInfo', nodeInfo).obj);
            } catch (e) {
                throw new Error('Error in meshtasticjs.nodeDB.addUserData:' + e.message);
            }
            
            this._dispatchInterfaceEvent('nodeListChanged');

            
            return nodeNumber;
        }

        node.user = user;
        this._dispatchInterfaceEvent('nodeListChanged');

        return nodeNumber;
    }

    addPositionData(nodeNumber, position) {

        let node = this.nodes.get(nodeNumber);
        
        if (node === undefined) {

            let nodeInfo = {
                num: nodeNumber,
                position: position,
                user: {}
            }

            try {
                this.nodes.set(nodeNumber, protobufHandler.toProtobuf('NodeInfo', nodeInfo).obj);
            } catch (e) {
                throw new Error('Error in meshtasticjs.nodeDB.addPositionData:' + e.message);
            }

            this._dispatchInterfaceEvent('nodeListChanged', nodeNumber);

            return nodeNumber;
        }

        
        node.position = position;
        this._dispatchInterfaceEvent('nodeListChanged', nodeNumber);

        return nodeNumber;
    }

    removeNode(nodeNumber) {

        this.nodes.delete(nodeNumber);
        this._dispatchInterfaceEvent('nodeListChanged', nodeNumber);
        return nodeNumber;

    }

    getNodeByNum(nodeNumber) {

        if (this.nodes.get(nodeNumber) === undefined) {
            return undefined;
        }
        
        return this.nodes.get(nodeNumber);

    }


    // ToDo: Add sort by field option
    getNodeList() {

        return this.nodes;
    }

    nodeNumToUserId(nodeNumber) {

        let node = this.nodes.get(nodeNumber);

        if (node === undefined || node.user.id === undefined) {
            return undefined;
        }

        return node.user.id;

    }


    userIdToNodeNum(userId) {

        var nodeNumber = undefined;

        this.nodes.forEach((node, num, map) => {
            if (node.hasOwnProperty('user') === true) {
                if (node.user.id === userId) {
                    nodeNumber = node.num;
                }
            }
        });

        return nodeNumber;
        
    }


    _dispatchInterfaceEvent(eventType, payload) {
        this.dispatchEvent(
            new CustomEvent(eventType, { detail: payload })
        );
    }

}