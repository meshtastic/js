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
    this.dispatchInterfaceEvent("nodeListChanged", nodeInfo.num);
  }

  /**
   * Adds user data to an existing node. Creates the node if it doesn't exist.
   * @param nodeInfo  Information about the node for the user data to be assigned to
   */
  addUserData(nodeNumber: number, user: User) {
    const node = this.nodes.get(nodeNumber);

    if (!node) {
      const nodeInfo = new NodeInfo({
        num: nodeNumber,
        position: new Position(),
        user,
      });

      try {
        this.nodes.set(nodeNumber, nodeInfo);
      } catch (e) {
        throw new Error(
          `Error in meshtasticjs.nodeDB.addUserData: ${e.message}`
        );
      }

      this.dispatchInterfaceEvent("nodeListChanged", nodeNumber);
    }

    node.user = user;
    this.dispatchInterfaceEvent("nodeListChanged", nodeNumber);
  }

  /**
   * Adds position data to an existing node. Creates the node if it doesn't exist.
   * @param nodeInfo Information about the node for the potition data to be assigned to
   */
  addPositionData(nodeNumber: number, position: Position) {
    const node = this.nodes.get(nodeNumber);

    if (!node) {
      const nodeInfo = new NodeInfo({
        num: nodeNumber,
        position,
        user: new User(),
      });

      try {
        this.nodes.set(nodeNumber, nodeInfo);
      } catch (e) {
        throw new Error(
          `Error in meshtasticjs.nodeDB.addPositionData: ${e.message}`
        );
      }

      this.dispatchInterfaceEvent("nodeListChanged", nodeNumber);
    }

    node.position = position;
    this.dispatchInterfaceEvent("nodeListChanged", nodeNumber);
  }

  /**
   * Removes node from the database.
   * @param nodeNumber Number of the node to be removed
   */
  removeNode(nodeNumber: number) {
    this.nodes.delete(nodeNumber);
    this.dispatchInterfaceEvent("nodeListChanged", nodeNumber);
  }

  /**
   * Gets a node by its node number
   * @param nodeNumber Number of the node to be fetched
   */
  getNodeByNum(nodeNumber: number) {
    return !this.nodes.get(nodeNumber) ? undefined : this.nodes.get(nodeNumber);
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
    const node = this.nodes.get(nodeNumber);

    return node?.user.id ?? node.user.id;
  }

  /**
   * Gets the node number to a user id, if known
   * @param userId Desired users id
   */
  userIdToNodeNum(userId: string) {
    let nodeNumber: number;

    this.nodes.forEach((node, _num, __map) => {
      if (node.hasOwnProperty("user")) {
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
   * @param nodeNumber NodeInfo.num
   */
  private dispatchInterfaceEvent(eventType: string, nodeNumber: number) {
    this.dispatchEvent(new CustomEvent(eventType, { detail: nodeNumber }));
  }
}
