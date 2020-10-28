import * as constants from "./constants";
import { SettingsManager } from "./settingsmanager";
import { NodeDB } from "./nodedb";
import { ProtobufHandler } from "./protobufs/protobufhandler";
import EventTarget from "@ungap/event-target"; // EventTarget polyfill for Edge and Safari
import { Position } from "./sharedTypes";

/**
 * Parent class for all connection interfaces - do not call directly
 * @abstract
 * @fires event:fromRadio - Gets called whenever a fromRadio message is received from device, returns fromRadio data
 * @fires event:dataPacket - Gets called when a data packet is received from device
 * @fires event:userPacket - Gets called when a user packet is received from device
 * @fires event:positionPacket - Gets called when a position packet is received from device
 * @fires event:nodeListChanged - Gets called when node database has been changed, returns changed node number
 * @fires event:connected - Gets called when link to device is connected
 * @fires event:disconnected - Gets called when link to device is disconnected
 * @fires event:configDone - Gets called when device has been configured (myInfo, radio and node data received). Device interface is now ready to be used
 *
 */
export class IMeshDevice extends EventTarget {
  isConnected: boolean;
  isReconnecting: boolean;
  isConfigDone: boolean;
  isConfigStarted: boolean;
  nodes: NodeDB;
  radioConfig: any; //protobufjs.RadioConfig
  currentPacketId: number;
  user: any; //protobufjs.User
  myInfo: any; //protobufjs.myInfo

  /******************
    # Child classes must implement:
    connect()
    disconnect()
    _readFromRadio()
    _writeToRadio()

    # State variables
    bool isConnected;
    bool isReconnecting;
    bool isConfigDone;
    bool isConfigStarted;
    
    # Data object variables
    var nodes;
    var radioConfig;
    var currentPacketId;
    var user;
    var myInfo;
    *******************/

  constructor() {
    super();

    /** @type {boolean} */
    this.isConnected = false;
    /** @type {boolean} */
    this.isReconnecting = false;
    /** @type {boolean} */
    this.isConfigDone = false;
    /** @type {boolean} */
    this.isConfigStarted = false;

    /** @type {NodeDB} */
    this.nodes = new NodeDB();
    this.nodes.addEventListener(
      "nodeListChanged",
      this._onNodeListChanged.bind(this)
    );

    /** @type {protobufjs.RadioConfig} */
    this.radioConfig = undefined;
    /** @type {number} */
    this.currentPacketId = undefined;
    /** @type {protobufjs.User} */
    this.user = undefined;
    /** @type {protobufjs.myInfo} */
    this.myInfo = undefined;
  }

  public _writeToRadio(param: any) {} /** @todo fix typings */
  public _readFromRadio() {} /** @todo fix typings */

  /**
   * Sends a text over the radio
   * @param {string} text
   * @param {number} [destinationNum=constants.BROADCAST_ADDR] Node number of the destination node
   * @param {boolean} [wantAck=false]
   * @param {boolean} [wantResponse=false]
   * @returns {FromRadio} FromRadio object that was sent to device
   */
  async sendText(
    text: string,
    destinationNum = constants.BROADCAST_ADDR,
    wantAck = false,
    wantResponse = false
  ) {
    let dataType = ProtobufHandler.getType(
      "Data.Type"
    ) as any; /** @todo fix typings */
    dataType = dataType.values["CLEAR_TEXT"];

    // DOMStrings are 16-bit-encoded strings, convert to UInt8Array first
    const enc = new TextEncoder();
    const encodedText = enc.encode(text);

    return await this.sendData(
      encodedText,
      destinationNum,
      dataType,
      wantAck,
      wantResponse
    );
  }

  /**
   * Sends generic data over the radio
   * @param {Uint8Array} byteData
   * @param {number} [destinationNum=constants.BROADCAST_ADDR] Node number of the destination node
   * @param {Data.Typ} dataType Enum of protobuf data type
   * @param {boolean} [wantAck=false]
   * @param {boolean} [wantResponse=false]
   * @returns {FromRadio} FromRadio object that was sent to device
   */
  async sendData(
    byteData: Uint8Array,
    destinationNum = constants.BROADCAST_ADDR,
    dataType,
    wantAck = false,
    wantResponse = false
  ) {
    if (dataType === undefined) {
      dataType = ProtobufHandler.getType("Data.Type");
      dataType = dataType.values["OPAQUE"];
    }

    let data = {} as any; /** @todo fix typings */

    data.payload = byteData;
    data.typ = dataType;

    let subPacket = {
      data: data,
      wantResponse: wantResponse,
    };

    let meshPacket = { decoded: subPacket };

    return await this.sendPacket(meshPacket, destinationNum, wantAck);
  }

  /**
   * Sends position over the radio
   * @param {number} [latitude=0]
   * @param {number} [longitude=0]
   * @param {number} [altitude=0]
   * @param {number} [timeSec=0]
   * @param {number} [destinationNum=constants.BROADCAST_ADDR] Node number of the destination node
   * @param {boolean} [wantAck=false]
   * @param {boolean} [wantResponse=false]
   * @returns {FromRadio} FromRadio object that was sent to device
   */
  async sendPosition(
    latitude?: number,
    longitude?: number,
    altitude?: number,
    timeSec = 0,
    destinationNum = constants.BROADCAST_ADDR,
    wantAck = false,
    wantResponse = false
  ) {
    let position: Position = {
      latitudeI: 0.0,
      longitudeI: 0.0,
      altitude: 0,
      time: Math.floor(Date.now() / 1000),
    };

    if (latitude != 0.0) {
      position.latitudeI = Math.floor(latitude / 1e-7);
    }

    if (longitude != 0.0) {
      position.longitudeI = Math.floor(longitude / 1e-7);
    }

    if (altitude != 0) {
      position.altitude = Math.floor(altitude);
    }

    if (timeSec != 0) {
      position.time = timeSec;
    }

    const subPacket = {
      position: position,
      wantResponse: wantResponse,
    };

    const meshPacket = { decoded: subPacket };

    return await this.sendPacket(meshPacket, destinationNum, wantAck);
  }

  /**
   * Sends packet over the radio
   * @param {MeshPacket} meshPacket
   * @param {number} [destinationNum=constants.BROADCAST_ADDR] Node number of the destination node
   * @param {boolean} [wantAck=false]
   * @returns {FromRadio} FromRadio object that was sent to device
   */
  async sendPacket(
    meshPacket,
    destinationNum = constants.BROADCAST_ADDR,
    wantAck = false
  ) {
    if (this.isDeviceReady() === false) {
      throw new Error(
        "Error in meshtasticjs.MeshInterface.sendPacket: Device is not ready"
      );
    }

    let rcptNodeNum: number;

    if (typeof destinationNum == "number") {
      rcptNodeNum = destinationNum;
    } else if (destinationNum == constants.BROADCAST_ADDR) {
      rcptNodeNum = constants.BROADCAST_NUM;
    } else {
      throw new Error(
        "Error in meshtasticjs.MeshInterface.sendPacket: Invalid destinationNum"
      );
    }

    meshPacket.to = rcptNodeNum;
    meshPacket.wantAck = wantAck;

    if (meshPacket.id === undefined || !meshPacket.hasOwnProperty("id")) {
      meshPacket.id = this._generatePacketId();
    }

    let packet = { packet: meshPacket };

    let toRadio = ProtobufHandler.toProtobuf("ToRadio", packet);
    await this._writeToRadio(toRadio.uint8array);
    return toRadio.obj;
  }

  /**
   * Writes radio config to device
   * @param {object} configOptions
   * @returns {FromRadio} FromRadio object that was sent to device
   */
  async setRadioConfig(configOptionsObj) {
    if (this.radioConfig === undefined || this.isDeviceReady() === false) {
      throw new Error(
        "Error: meshtasticjs.IMeshDevice.setRadioConfig: Radio config has not been read from device, can't set new one. Try reconnecting."
      );
    }

    if (
      !configOptionsObj.hasOwnProperty("channelSettings") &&
      !configOptionsObj.hasOwnProperty("preferences")
    ) {
      throw new Error(
        "Error: meshtasticjs.IMeshDevice.setRadioConfig: Invalid config options object provided"
      );
    }

    if (configOptionsObj.hasOwnProperty("channelSettings")) {
      if (this.radioConfig.hasOwnProperty("channelSettings")) {
        Object.assign(
          this.radioConfig.channelSettings,
          configOptionsObj.channelSettings
        );
      } else {
        this.radioConfig.channelSettings = ProtobufHandler.toProtobuf(
          "ChannelSettings",
          configOptionsObj.channelSettings
        ).obj;
      }
    }
    if (configOptionsObj.hasOwnProperty("preferences")) {
      if (this.radioConfig.hasOwnProperty("preferences")) {
        Object.assign(
          this.radioConfig.preferences,
          configOptionsObj.preferences
        );
      } else {
        this.radioConfig.preferences = ProtobufHandler.toProtobuf(
          "UserPreferences",
          configOptionsObj.preferences
        ).obj;
      }
    }

    let setRadio = { setRadio: this.radioConfig };

    let toRadio = ProtobufHandler.toProtobuf("ToRadio", setRadio);
    await this._writeToRadio(toRadio.uint8array);
    return toRadio.obj;
  }

  /**
   * Sets devices owner data
   * @param {object} ownerData
   * @returns {FromRadio} FromRadio object that was sent to device
   */
  async setOwner(ownerDataObj) {
    if (this.user === undefined || this.isDeviceReady() === false) {
      throw new Error(
        "Error: meshtasticjs.IMeshDevice.setOwner: Owner config has not been read from device, can't set new one. Try reconnecting."
      );
    }

    if (typeof ownerDataObj !== "object") {
      throw new Error(
        "Error: meshtasticjs.IMeshDevice.setRadioConfig: Invalid config options object provided"
      );
    }

    Object.assign(this.user, ownerDataObj);

    let setOwner = { setOwner: this.user };

    let toRadio = ProtobufHandler.toProtobuf("ToRadio", setOwner);
    await this._writeToRadio(toRadio.uint8array);
    return toRadio.obj;
  }

  /**
   * Manually triggers the device configure process
   * @returns {number} Returns 0 if successful
   */
  async configure() {
    if (this.isConnected === false) {
      throw new Error(
        "Error in meshtasticjs.MeshInterface.configure: Interface is not connected"
      );
    }

    this.isConfigStarted = true;

    let wantConfig = {} as any; /** @todo fix typings */
    wantConfig.wantConfigId = constants.MY_CONFIG_ID;
    let toRadio = ProtobufHandler.toProtobuf("ToRadio", wantConfig);

    await this._writeToRadio(toRadio.uint8array);

    await this._readFromRadio();

    if (this.isConfigDone === false) {
      throw new Error(
        "Error in meshtasticjs.MeshInterface.configure: configuring device was not successful"
      );
    }

    return 0;
  }

  /**
   * Checks if device is ready
   * @returns {number} true if device interface is fully configured and can be used
   */
  isDeviceReady() {
    if (this.isConnected === true && this.isConfigDone === true) {
      return true;
    } else {
      return false;
    }
  }

  _generatePacketId() {
    if (this.currentPacketId === undefined) {
      throw "Error in meshtasticjs.MeshInterface.generatePacketId: Interface is not configured, can't generate packet id";
    } else {
      this.currentPacketId = this.currentPacketId + 1;
      return this.currentPacketId;
    }
  }

  async _handleFromRadio(fromRadioUInt8Array: Uint8Array) {
    let fromRadioObj: any; /** @todo needs definition */

    if (fromRadioUInt8Array.byteLength < 1) {
      if (SettingsManager.debugMode) {
        console.log("Empty buffer received");
      }
      return 0;
    }

    try {
      fromRadioObj = ProtobufHandler.fromProtobuf(
        "FromRadio",
        fromRadioUInt8Array
      );
    } catch (e) {
      throw new Error(
        "Error in meshtasticjs.IMeshDevice.handleFromRadio: " + e.message
      );
    }

    if (SettingsManager.debugMode) {
      console.log(fromRadioObj);
    }

    if (this.isConfigDone === true) {
      this._dispatchInterfaceEvent("fromRadio", fromRadioObj);
    }

    if (fromRadioObj.hasOwnProperty("myInfo")) {
      this.myInfo = fromRadioObj.myInfo;
      this.currentPacketId = fromRadioObj.myInfo.currentPacketId;
    } else if (fromRadioObj.hasOwnProperty("radio")) {
      this.radioConfig = fromRadioObj.radio;
    } else if (fromRadioObj.hasOwnProperty("nodeInfo")) {
      this.nodes.addNode(fromRadioObj.nodeInfo);

      // TOFIX do this when config done, if myInfo gets sent last, this throws error
      if (fromRadioObj.nodeInfo.num === this.myInfo.myNodeNum) {
        this.user = fromRadioObj.nodeInfo.user;
      }
    } else if (fromRadioObj.hasOwnProperty("configCompleteId")) {
      if (fromRadioObj.configCompleteId === constants.MY_CONFIG_ID) {
        if (
          this.myInfo !== undefined &&
          this.radioConfig !== undefined &&
          this.user !== undefined &&
          this.currentPacketId !== undefined
        ) {
          this._onConfigured();
        } else {
          throw new Error(
            "Error in meshtasticjs.MeshInterface.handleFromRadio: Config received from device incomplete"
          );
        }
      }
    } else if (fromRadioObj.hasOwnProperty("packet")) {
      this._handleMeshPacket(fromRadioObj.packet);
    } else if (fromRadioObj.hasOwnProperty("rebooted")) {
      await this.configure();
    } else {
      // Don't throw error here, continue and just log to console
      if (SettingsManager.debugMode) {
        console.log(
          "Error in meshtasticjs.MeshInterface.handleFromRadio: Invalid data received"
        );
      }
    }

    return fromRadioObj;
  }

  _handleMeshPacket(meshPacket) {
    let eventName: string;

    if (meshPacket.decoded.hasOwnProperty("data")) {
      if (!meshPacket.decoded.data.hasOwnProperty("typ")) {
        meshPacket.decoded.data.typ = "OPAQUE";
      }

      eventName = "dataPacket";
    } else if (meshPacket.decoded.hasOwnProperty("user")) {
      this.nodes.addUserData(meshPacket.from, meshPacket.decoded.user);
      eventName = "userPacket";
    } else if (meshPacket.decoded.hasOwnProperty("position")) {
      this.nodes.addPositionData(meshPacket.from, meshPacket.decoded.position);
      eventName = "positionPacket";
    }

    this._dispatchInterfaceEvent(eventName, meshPacket);
  }

  // Gets called when a link to the device has been established
  async _onConnected(noAutoConfig: boolean) {
    this.isConnected = true;
    this.isReconnecting = false;
    this._dispatchInterfaceEvent("connected", this);

    if (noAutoConfig !== true) {
      try {
        await this.configure();
        return;
      } catch (e) {
        throw new Error(
          "Error in meshtasticjs.IMeshDevice.onConnected: " + e.message
        );
      }
    }
  }

  // Gets called when a link to the device has been disconnected
  _onDisconnected() {
    this._dispatchInterfaceEvent("disconnected", this);
    this.isConnected = false;
  }

  // Gets called when the device has been configured (myInfo, radio and node data received). device interface is now ready to be used
  _onConfigured() {
    this.isConfigDone = true;
    this._dispatchInterfaceEvent("configDone", this);
    if (SettingsManager.debugMode) {
      console.log(
        "Configured device with node number " + this.myInfo.myNodeNum
      );
    }
  }

  _onNodeListChanged() {
    if (this.isConfigDone === true) {
      this._dispatchInterfaceEvent("nodeListChanged", this);
    }
  }

  /** change eventType to enum */
  _dispatchInterfaceEvent(eventType: string, payload) {
    this.dispatchEvent(new CustomEvent(eventType, { detail: payload }));
  }
}
