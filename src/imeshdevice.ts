import * as constants from "./constants";
import { SettingsManager } from "./settingsmanager";
import { NodeDB } from "./nodedb";
import EventTarget from "@ungap/event-target";
import {
  ChannelSettings,
  Data,
  FromRadio,
  MeshPacket,
  MyNodeInfo,
  Position,
  RadioConfig,
  SubPacket,
  ToRadio,
  TypeEnum,
  User,
  UserPreferences,
} from "./protobuf";

/**
 * @todo is the event tag required on classes that contain events?
 * @event
 */
export abstract class IMeshDevice extends EventTarget {
  /**
   * States if the current device is currently connected or not
   */
  isConnected: boolean;

  /**
   * States if the current device is in a reconnecting state
   */
  isReconnecting: boolean;

  /**
   * Short description
   */
  isConfigDone: boolean;

  /**
   * Short description
   */
  isConfigStarted: boolean;

  /**
   * Short description
   */
  nodes: NodeDB;

  /**
   * Short description
   */
  radioConfig: RadioConfig;

  /**
   * Short description
   */
  currentPacketId: number;

  /**
   * Short description
   */
  user: User;

  /**
   * Short description
   */
  myInfo: MyNodeInfo;

  constructor() {
    super();

    this.isConnected = false;
    this.isReconnecting = false;
    this.isConfigDone = false;
    this.isConfigStarted = false;

    this.nodes = new NodeDB();
    this.nodes.addEventListener(
      "nodeListChanged",
      this.onNodeListChanged.bind(this)
    );

    this.radioConfig = undefined;
    this.currentPacketId = undefined;
    this.user = undefined;
    this.myInfo = undefined;
  }

  /**
   * Short description
   */
  abstract writeToRadio(ToRadioUInt8Array: Uint8Array): Promise<void>;

  /**
   * Short description
   */
  abstract readFromRadio(): Promise<void>;

  /**
   * Short description
   * @todo strongly type and maybe unify this function
   */
  abstract connect(..._: any): Promise<void>;

  /**
   * Short description
   */
  abstract disconnect(): void;

  /**
   * Sends a text over the radio
   * @param text
   * @param destinationNum Node number of the destination node
   * @param wantAck
   * @param wantResponse
   */
  sendText(
    text: string,
    destinationNum = constants.BROADCAST_ADDR,
    wantAck = false,
    wantResponse = false
  ) {
    // DOMStrings are 16-bit-encoded strings, convert to UInt8Array first
    const enc = new TextEncoder();

    return this.sendData(
      enc.encode(text),
      destinationNum,
      TypeEnum.CLEAR_TEXT,
      wantAck,
      wantResponse
    );
  }

  /**
   * Sends generic data over the radio
   * @param byteData
   * @param destinationNum Node number of the destination node
   * @param dataType dataType Enum of protobuf data type
   * @param wantAck
   * @param wantResponse
   */
  sendData(
    byteData: Uint8Array,
    destinationNum = constants.BROADCAST_ADDR,
    dataType: TypeEnum,
    wantAck = false,
    wantResponse = false
  ) {
    let meshPacket = new MeshPacket({
      decoded: new SubPacket({
        data: new Data({
          payload: byteData,
          typ: dataType,
        }),
        wantResponse: wantResponse,
      }),
    });

    return this.sendPacket(meshPacket, destinationNum, wantAck);
  }

  /**
   * Sends position over the radio
   * @param latitude
   * @param longitude
   * @param altitude
   * @param timeSec
   * @param destinationNum Node number of the destination node
   * @param wantAck
   * @param wantResponse
   */
  sendPosition(
    latitude?: number,
    longitude?: number,
    altitude?: number,
    timeSec = 0,
    destinationNum = constants.BROADCAST_ADDR,
    wantAck = false,
    wantResponse = false
  ) {
    const meshPacket = new MeshPacket({
      decoded: new SubPacket({
        position: new Position({
          latitudeI: latitude !== 0.0 ? Math.floor(latitude / 1e-7) : 0.0,
          longitudeI: longitude !== 0.0 ? Math.floor(longitude / 1e-7) : 0.0,
          altitude: altitude !== 0 ? Math.floor(altitude) : 0,
          time: timeSec !== 0 ? timeSec : Math.floor(Date.now() / 1000),
        }),
        wantResponse: wantResponse,
      }),
    });

    return this.sendPacket(meshPacket, destinationNum, wantAck);
  }

  /**
   * Sends packet over the radio
   * @param meshPacket
   * @param destinationNum Node number of the destination node
   * @param wantAck
   */
  async sendPacket(
    meshPacket: MeshPacket,
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
      meshPacket.id = this.generatePacketId();
    }

    let encodedData = ToRadio.encode(
      new ToRadio({
        packet: meshPacket,
      })
    ).finish();

    await this.writeToRadio(encodedData);
  }

  /**
   * Writes radio config to device
   * @param configOptions
   */
  async setRadioConfig(configOptionsObj: RadioConfig) {
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
        this.radioConfig.channelSettings = new ChannelSettings(
          configOptionsObj.channelSettings
        );
      }
    }
    if (configOptionsObj.hasOwnProperty("preferences")) {
      if (this.radioConfig.hasOwnProperty("preferences")) {
        Object.assign(
          this.radioConfig.preferences,
          configOptionsObj.preferences
        );
      } else {
        this.radioConfig.preferences = new UserPreferences(
          configOptionsObj.preferences
        );
      }
    }

    let toRadio = new ToRadio({
      setRadio: this.radioConfig,
    });
    await this.writeToRadio(ToRadio.encode(toRadio).finish());
  }

  /**
   * Sets devices owner data
   * @param ownerDataObj
   */
  async setOwner(ownerDataObj: User) {
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

    let toRadio = new ToRadio({
      setOwner: this.user,
    });
    await this.writeToRadio(ToRadio.encode(toRadio).finish());
  }

  /**
   * Manually triggers the device configure process
   */
  async configure() {
    if (this.isConnected === false) {
      throw new Error(
        "Error in meshtasticjs.MeshInterface.configure: Interface is not connected"
      );
    }

    this.isConfigStarted = true;

    let toRadio = new ToRadio({
      wantConfigId: constants.MY_CONFIG_ID,
    });

    await this.writeToRadio(ToRadio.encode(toRadio).finish());

    await this.readFromRadio();

    if (this.isConfigDone === false) {
      throw new Error(
        "Error in meshtasticjs.MeshInterface.configure: configuring device was not successful"
      );
    }
  }

  /**
   * Checks if device is ready
   */
  isDeviceReady() {
    return this.isConnected === true && this.isConfigDone === true;
  }

  /**
   * Short description
   */
  private generatePacketId() {
    if (this.currentPacketId === undefined) {
      throw new Error(
        "Error in meshtasticjs.MeshInterface.generatePacketId: Interface is not configured, can't generate packet id"
      );
    } else {
      return this.currentPacketId++;
    }
  }

  /**
   * Gets called whenever a fromRadio message is received from device, returns fromRadio data
   * @todo change to support `all=true` (batch requests)
   * @event
   * @param fromRadioUInt8Array
   */
  protected async handleFromRadio(fromRadioUInt8Array: Uint8Array) {
    let fromRadioObj: FromRadio;

    if (fromRadioUInt8Array.byteLength < 1 && SettingsManager.debugMode) {
      console.log("Empty buffer received");
    }

    try {
      fromRadioObj = FromRadio.decode(fromRadioUInt8Array);
    } catch (e) {
      throw new Error(
        "Error in meshtasticjs.IMeshDevice.handleFromRadio: " + e.message
      );
    }

    if (SettingsManager.debugMode) {
      console.log(fromRadioObj);
    }

    if (this.isConfigDone === true) {
      this.dispatchInterfaceEvent("fromRadio", fromRadioObj);
    }

    if (fromRadioObj.hasOwnProperty("myInfo")) {
      this.myInfo = fromRadioObj.myInfo;
      this.currentPacketId = fromRadioObj.myInfo.currentPacketId;
    } else if (fromRadioObj.hasOwnProperty("radio")) {
      this.radioConfig = fromRadioObj.radio;
    } else if (fromRadioObj.hasOwnProperty("nodeInfo")) {
      this.nodes.addNode(fromRadioObj.nodeInfo);

      /** @fix do this when config done, if myInfo gets sent last, this throws error */
      if (fromRadioObj.nodeInfo.num === this.myInfo.myNodeNum) {
        this.user = fromRadioObj.nodeInfo.user;
      }
    } else if (fromRadioObj.hasOwnProperty("configCompleteId")) {
      if (fromRadioObj.configCompleteId === constants.MY_CONFIG_ID) {
        if (
          this.myInfo &&
          this.radioConfig &&
          this.user &&
          this.currentPacketId
        ) {
          this.onConfigured();
        } else {
          throw new Error(
            "Error in meshtasticjs.MeshInterface.handleFromRadio: Config received from device incomplete"
          );
        }
      }
    } else if (fromRadioObj.hasOwnProperty("packet")) {
      this.handleMeshPacket(fromRadioObj.packet);
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
  }

  /**
   * Gets called when a data, user or position packet is received from device
   * @event
   * @param meshPacket
   */
  private handleMeshPacket(meshPacket: MeshPacket) {
    let eventName: string;

    if (meshPacket.decoded.hasOwnProperty("data")) {
      if (!meshPacket.decoded.data.hasOwnProperty("typ")) {
        meshPacket.decoded.data.typ = TypeEnum.OPAQUE;
      }

      eventName = "dataPacket";
    } else if (meshPacket.decoded.hasOwnProperty("user")) {
      this.nodes.addUserData(meshPacket.from, meshPacket.decoded.user);
      eventName = "userPacket";
    } else if (meshPacket.decoded.hasOwnProperty("position")) {
      this.nodes.addPositionData(meshPacket.from, meshPacket.decoded.position);
      eventName = "positionPacket";
    }

    this.dispatchInterfaceEvent(eventName, meshPacket);
  }

  /**
   * Gets called when a link to the device has been established
   * @event
   * @param noAutoConfig Disables autoconfiguration
   */
  protected async onConnected(noAutoConfig: boolean) {
    this.isConnected = true;
    this.isReconnecting = false;
    this.dispatchInterfaceEvent("connected", this);

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

  /**
   * Gets called when a link to the device has been disconnected
   * @event
   */
  protected onDisconnected() {
    this.dispatchInterfaceEvent("disconnected", this);
    this.isConnected = false;
  }

  /**
   * Gets called when the device has been configured (myInfo, radio and node data received). device interface is now ready to be used
   * @event
   */
  private onConfigured() {
    this.isConfigDone = true;
    this.dispatchInterfaceEvent("configDone", this);
    if (SettingsManager.debugMode) {
      console.log(
        "Configured device with node number " + this.myInfo.myNodeNum
      );
    }
  }

  /**
   * Gets called when node database has been changed, returns changed node number
   * @event
   */
  private onNodeListChanged() {
    if (this.isConfigDone === true) {
      this.dispatchInterfaceEvent("nodeListChanged", this);
    }
  }

  /**
   * Short description
   * @todo change eventType to enum
   * @todo define payload type
   * @param eventType
   * @param payload
   */
  private dispatchInterfaceEvent(eventType: string, payload: any) {
    this.dispatchEvent(new CustomEvent(eventType, { detail: payload }));
  }
}
