import * as constants from "./constants.js"
import { SettingsManager } from "./settingsmanager.js"
import { ProtobufHandler } from "./protobufs/protobufhandler.js"
import EventTarget from '@ungap/event-target' // EventTarget polyfill for Edge and Safari

/**
 * Stores and manages Node objects 
 */
export class NodeDB extends EventTarget {
    
    /******************
    var nodes;
    *******************/

    constructor() {

        super();

        /** @type {Map} */
        this.nodes = new Map();

    }

    /**
     * Adds a node object to the database.
     * @param {NodeInfo} nodeInfo 
     * @returns {number} number of node added
     */
    addNode(nodeInfo) {

        this.nodes.set(nodeInfo.num, nodeInfo);
        this._dispatchInterfaceEvent('nodeListChanged', nodeInfo.num);
        return nodeInfo.num;

    }

    /**
     * Adds user data to an existing node. Creates the node if it doesn't exist.
     * @param {NodeInfo} nodeInfo 
     * @returns {number} number of node modified
     */
    addUserData(nodeNumber, user) {

        let node = this.nodes.get(nodeNumber);

        if (node === undefined) {

            let nodeInfo = {
                num: nodeNumber,
                position: {},
                user: user
            }

            try {
                this.nodes.set(nodeNumber, ProtobufHandler.toProtobuf('NodeInfo', nodeInfo).obj);
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

    /**
     * Adds position data to an existing node. Creates the node if it doesn't exist.
     * @param {NodeInfo} nodeInfo 
     * @returns {number} number of node modified
     */
    addPositionData(nodeNumber, position) {

        let node = this.nodes.get(nodeNumber);
        
        if (node === undefined) {

            let nodeInfo = {
                num: nodeNumber,
                position: position,
                user: {}
            }

            try {
                this.nodes.set(nodeNumber, ProtobufHandler.toProtobuf('NodeInfo', nodeInfo).obj);
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

    /**
     * Removes node from the database.
     * @param {number} nodeNumber 
     * @returns {number} number of node removed
     */
    removeNode(nodeNumber) {

        this.nodes.delete(nodeNumber);
        this._dispatchInterfaceEvent('nodeListChanged', nodeNumber);
        return nodeNumber;

    }

    /**
     * Gets a node by its node number
     * @param {number} nodeNumber 
     * @returns {NodeInfo} 
     */
    getNodeByNum(nodeNumber) {

        if (this.nodes.get(nodeNumber) === undefined) {
            return undefined;
        }
        
        return this.nodes.get(nodeNumber);

    }


    // ToDo: Add sort by field option
    /**
     * Gets a list of all nodes in the database.
     * @returns {Map} Map with node numbers as keys and NodeInfo objects as value
     */
    getNodeList() {

        return this.nodes;
    }

    /**
     * Gets the associated user id to a node number, if known
     * @param {number} nodeNumber 
     * @returns {string} user id
     */
    nodeNumToUserId(nodeNumber) {

        let node = this.nodes.get(nodeNumber);

        if (node === undefined || node.user.id === undefined) {
            return undefined;
        }

        return node.user.id;

    }

    /**
     * Gets the node number to a user id, if known
     * @param {string} userId 
     * @returns {number} nodeNumber
     */
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