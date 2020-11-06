import EventTarget from "@ungap/event-target";
import { NodeInfo, Position, User } from "./protobuf";

/**
 * Stores and manages Node objects
 */
export class NodeDB extends EventTarget {
  /**
   * Short description
   */
  nodes: Map<number, NodeInfo>;

  constructor() {
    super();

    this.nodes = new Map();
  }

  /**
   * Adds a node object to the database.
   * @param nodeInfo Information about the new node
   */
  addNode(nodeInfo: NodeInfo) {
    this.nodes.set(nodeInfo.num, nodeInfo);
    this._dispatchInterfaceEvent("nodeListChanged", nodeInfo.num);
  }

  /**
   * Adds user data to an existing node. Creates the node if it doesn't exist.
   * @param nodeInfo  Information about the node for the user data to be assigned to
   */
  addUserData(nodeNumber: number, user: User) {
    let node = this.nodes.get(nodeNumber);

    if (node === undefined) {
      let nodeInfo = new NodeInfo({
        num: nodeNumber,
        position: new Position(),
        user: user,
      });

      try {
        this.nodes.set(nodeNumber, nodeInfo);
      } catch (e) {
        throw new Error(
          "Error in meshtasticjs.nodeDB.addUserData:" + e.message
        );
      }

      this._dispatchInterfaceEvent("nodeListChanged", null);
    }

    node.user = user;
    this._dispatchInterfaceEvent("nodeListChanged", null);
  }

  /**
   * Adds position data to an existing node. Creates the node if it doesn't exist.
   * @param nodeInfo Information about the node for the potition data to be assigned to
   */
  addPositionData(nodeNumber: number, position: Position) {
    let node = this.nodes.get(nodeNumber);

    if (node === undefined) {
      let nodeInfo = new NodeInfo({
        num: nodeNumber,
        position: position,
        user: new User(),
      });

      try {
        this.nodes.set(nodeNumber, nodeInfo);
      } catch (e) {
        throw new Error(
          "Error in meshtasticjs.nodeDB.addPositionData:" + e.message
        );
      }

      this._dispatchInterfaceEvent("nodeListChanged", nodeNumber);
    }

    node.position = position;
    this._dispatchInterfaceEvent("nodeListChanged", nodeNumber);
  }

  /**
   * Removes node from the database.
   * @param nodeNumber Number of the node to be removed
   */
  removeNode(nodeNumber: number) {
    this.nodes.delete(nodeNumber);
    this._dispatchInterfaceEvent("nodeListChanged", nodeNumber);
  }

  /**
   * Gets a node by its node number
   * @param nodeNumber Number of the node to be fetched
   */
  getNodeByNum(nodeNumber: number) {
    return this.nodes.get(nodeNumber) === undefined
      ? undefined
      : this.nodes.get(nodeNumber);
  }

  /**
   * Gets a list of all nodes in the database.
   * @todo Add sort by field option
   */
  getNodeList() {
    return this.nodes;
  }

  /**
   * Gets the associated user id to a node number, if known
   * @param nodeNumber desired nodes number
   */
  nodeNumToUserId(nodeNumber: number) {
    let node = this.nodes.get(nodeNumber);

    return node === undefined || node.user.id === undefined
      ? undefined
      : node.user.id;
  }

  /**
   * Gets the node number to a user id, if known
   * @param userId Desired users id
   */
  userIdToNodeNum(userId: string) {
    let nodeNumber: number = undefined;

    this.nodes.forEach((node, _num, __map) => {
      if (node.hasOwnProperty("user") === true) {
        if (node.user.id === userId) {
          nodeNumber = node.num;
        }
      }
    });

    return nodeNumber;
  }

  /**
   * Short description
   * @param eventType
   * @param payload NodeInfo.num or null
   */
  _dispatchInterfaceEvent(eventType: string, payload: number | null) {
    this.dispatchEvent(new CustomEvent(eventType, { detail: payload }));
  }
}
