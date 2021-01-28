import {
  Data,
  FromRadio,
  MeshPacket,
  MyNodeInfo,
  Position,
  RadioConfig,
  SubPacket,
  ToRadio,
  PortNumEnum,
  User,
  UserPreferences,
  LogLevelEnum,
  NodeInfo,
} from "./protobuf";
import { ConnectionEventEnum } from "./types";
import { log } from "./utils";
import { BROADCAST_NUM, MY_CONFIG_ID } from "./constants";
import { Subject } from "rxjs";

/**
 * Base class for connection methods to extend
 */
export abstract class IMeshDevice {
  /**
   * States if the current device is currently connected or not
   */
  isConnected: boolean;

  /**
   * States if the current device is in a reconnecting state
   */
  isReconnecting: boolean;

  /**
   * States if the device has been configured
   */
  isConfigDone: boolean;

  /**
   * States if device configure process has been started
   */
  isConfigStarted: boolean;

  /**
   * Configuration of current device
   */
  radioConfig: RadioConfig;

  /**
   * Packet identifier of last message sent, gets increased by one on every sent message
   */
  currentPacketId: number;

  /**
   * Node info of current device
   */
  myInfo: MyNodeInfo;

  constructor() {
    this.isConnected = false;
    this.isReconnecting = false;
    this.isConfigDone = false;
    this.isConfigStarted = false;
    this.radioConfig = undefined;
    this.currentPacketId = undefined;
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
   */
  abstract connect(..._: any): Promise<void>;

  /**
   * Short description
   */
  abstract disconnect(): void;

  /**
   * Ping abstract class
   * @todo
   */
  abstract ping(): boolean;

  /**
   * Fires when a new FromRadio message has been received from device
   * @event
   */
  readonly onFromRadioEvent: Subject<FromRadio> = new Subject();

  /**
   * Fires when a new FromRadio message containing a Data packet has been received from device
   * @event
   */
  readonly onDataPacketEvent: Subject<MeshPacket> = new Subject();

  /**
   * Fires when a new FromRadio message containing a NodeInfo packet has been received from device
   * @event
   */
  readonly onNodeInfoPacketEvent: Subject<{
    packet: MeshPacket;
    data: NodeInfo;
  }> = new Subject();

  /**
   * Fires when a new FromRadio message containing a Position packet has been received from device
   * @event
   */
  readonly onPositionPacketEvent: Subject<{
    packet: MeshPacket;
    data: Position;
  }> = new Subject();

  /**
   * Fires when a new FromRadio message containing a Position packet has been received from device
   * @event
   */
  readonly onTextPacketEvent: Subject<{
    packet: MeshPacket;
    data: string;
  }> = new Subject();

  /**
   * Fires when the device configuration was successful. The device can then be used
   * @todo strongly type this, likely multiple events for different config items, i.e. (radioConfig), ChannelSettings and UserPreferences
   * @event
   */
  readonly onConfigEvent: Subject<any> = new Subject();

  /**
   * Fires when the node database has changed
   * @event
   */
  readonly onConnectionEvent: Subject<ConnectionEventEnum> = new Subject();

  /**
   * Sends a text over the radio
   * @param text
   * @param destinationNum Node number of the destination node
   * @param wantAck
   * @param wantResponse
   */
  sendText(
    text: string,
    destinationNum?: number,
    wantAck = false,
    wantResponse = false
  ) {
    /**
     * DOMStrings are 16-bit-encoded strings, convert to UInt8Array first
     */
    const enc = new TextEncoder();

    return this.sendData(
      enc.encode(text),
      PortNumEnum.TEXT_MESSAGE_APP,
      destinationNum,
      wantAck,
      wantResponse
    );
  }

  /**
   * Sends arbitrary data over the radio
   * @param byteData
   * @param dataType dataType Enum of protobuf data type
   * @param destinationNum Node number of the destination node
   * @param wantAck
   * @param wantResponse
   */
  sendData(
    byteData: Uint8Array,
    dataType: PortNumEnum,
    destinationNum?: number,
    wantAck = false,
    wantResponse = false
  ) {
    return this.sendPacket(
      new MeshPacket({
        decoded: new SubPacket({
          data: new Data({
            payload: byteData,
            portnum: dataType,
          }),
          wantResponse,
        }),
      }),
      destinationNum,
      wantAck
    );
  }

  /**
   * Sends packet over the radio
   * @param meshPacket
   * @param destinationNum Node number of the destination node
   * @param wantAck
   */
  async sendPacket(
    meshPacket: MeshPacket,
    destinationNum?: number,
    wantAck = false
  ) {
    if (!this.isDeviceReady()) {
      log(
        `IMeshDevice.sendPacket`,
        `Device is not ready`,
        LogLevelEnum.WARNING
      );
    }

    meshPacket.to = destinationNum ? destinationNum : BROADCAST_NUM;
    meshPacket.wantAck = wantAck;
    meshPacket.id = meshPacket.id ?? this.generatePacketId();

    await this.writeToRadio(
      ToRadio.encode(
        new ToRadio({
          packet: meshPacket,
        })
      ).finish()
    );
  }

  /**
   * Writes radio config to device
   * @param configOptions
   */
  async setRadioConfig(configOptions: RadioConfig) {
    if (!this.radioConfig || !this.isDeviceReady()) {
      log(
        `IMeshDevice.setRadioConfig`,
        `Radio config has not been read from device, can't set new one.`,
        LogLevelEnum.WARNING
      );
    }

    if (this.radioConfig?.preferences) {
      Object.assign(this.radioConfig.preferences, configOptions.preferences);
    } else {
      this.radioConfig.preferences = new UserPreferences(
        configOptions.preferences
      );
    }

    await this.writeToRadio(
      ToRadio.encode(
        new ToRadio({
          setRadio: this.radioConfig,
        })
      ).finish()
    );
  }

  /**
   * Sets devices owner data
   * @param ownerData
   */
  async setOwner(ownerData: User) {
    if (!this.isDeviceReady()) {
      /**
       * @todo used to check if user had been read from radio, change this
       */
      log(
        `IMeshDevice.setOwner`,
        `Owner config has not been read from device, can't set new one.`,
        LogLevelEnum.WARNING
      );
    }

    await this.writeToRadio(
      ToRadio.encode(
        new ToRadio({
          setOwner: ownerData,
        })
      ).finish()
    );
  }

  /**
   * Manually triggers the device configure process
   */
  async configure() {
    if (!this.isConnected) {
      console.log(
        `IMeshDevice.configure`,
        `Interface is not connected`,
        LogLevelEnum.ERROR
      );
    }

    this.isConfigStarted = true;

    log(
      `IMeshDevice.configure`,
      `Requesting radio configuration.`,
      LogLevelEnum.DEBUG
    );
    await this.writeToRadio(
      ToRadio.encode(
        new ToRadio({
          wantConfigId: MY_CONFIG_ID,
        })
      ).finish()
    );

    log(
      `IMeshDevice.configure`,
      `Waiting to read radio configuration.`,
      LogLevelEnum.DEBUG
    );
    await this.readFromRadio().then(() => {
      log(
        `IMeshDevice.configure`,
        `Completed reading radio configuration.`,
        LogLevelEnum.DEBUG
      );
    });
  }

  /**
   * Checks if device is ready
   */
  isDeviceReady() {
    return this.isConnected && this.isConfigDone;
  }

  /**
   * Generates packet identifier for new message by increasing previous packet id by one
   */
  private generatePacketId() {
    if (!this.currentPacketId) {
      log(
        `IMeshDevice.generatePacketId`,
        `Failed to generate packet id.`,
        LogLevelEnum.ERROR
      );
      return 0;
    } else {
      return this.currentPacketId++;
    }
  }

  /**
   * Gets called whenever a fromRadio message is received from device, returns fromRadio data
   * @todo change to support `all=true` (batch requests)
   * @param fromRadio Uint8Array containing raw radio data
   */
  protected async handleFromRadio(fromRadio: Uint8Array) {
    let fromRadioObj: FromRadio;

    if (fromRadio.byteLength < 1) {
      log(
        `IMeshDevice.handleFromRadio`,
        `Empty buffer received.`,
        LogLevelEnum.DEBUG
      );
    }

    try {
      fromRadioObj = FromRadio.decode(fromRadio);
    } catch (e) {
      log(`IMeshDevice.handleFromRadio`, e.message, LogLevelEnum.ERROR);
    }
    /**
     * @todo
     * ? Why do we need to check if isConfigDone, as the rest of the code executes regardless
     */
    if (this.isConfigDone) {
      log(
        `IMeshDevice.handleFromRadio`,
        "Sending onFromRadioEvent",
        LogLevelEnum.DEBUG
      );
      this.onFromRadioEvent.next(fromRadioObj);
    }

    if (fromRadioObj?.myInfo) {
      this.myInfo = fromRadioObj.myInfo;
      this.currentPacketId = fromRadioObj.myInfo.currentPacketId;
    } else if (fromRadioObj?.radio) {
      this.radioConfig = fromRadioObj.radio;
    } else if (fromRadioObj?.nodeInfo) {
      log(
        `IMeshDevice.handleFromRadio`,
        "Sending onNodeInfoPacketEvent",
        LogLevelEnum.DEBUG
      );
      this.onNodeInfoPacketEvent.next({
        packet: fromRadioObj.packet,
        data: fromRadioObj.nodeInfo,
      });
    } else if (fromRadioObj?.configCompleteId) {
      if (fromRadioObj.configCompleteId === MY_CONFIG_ID) {
        if (this.myInfo && this.radioConfig && this.currentPacketId) {
          this.isConfigDone = true;
          log(
            `IMeshDevice.handleFromRadio`,
            "Sending onConfigEvent",
            LogLevelEnum.DEBUG
          );
          this.onConfigEvent.next(this);
          log(
            `IMeshDevice.handleFromRadio`,
            `Configured device with node number ${this.myInfo.myNodeNum}`,
            LogLevelEnum.DEBUG
          );
        } else {
          log(
            `IMeshDevice.handleFromRadio`,
            `Incomplete config reveived from device`,
            LogLevelEnum.WARNING
          );
        }
      }
    } else if (fromRadioObj?.packet) {
      this.handleMeshPacket(fromRadioObj.packet);
    } else if (fromRadioObj?.rebooted) {
      /**
       * @todo check if we should move the device ping here, or move it to a seperate method (abstract?) to allow us to ping ble, http, serial devices whenever...
       */

      await this.configure();
    } else {
      log(
        `MeshInterface.handleFromRadio`,
        `Invalid data received`,
        LogLevelEnum.ERROR
      );
    }
  }

  /**
   * Gets called when a data, user or position packet is received from device
   * @param meshPacket
   */
  private handleMeshPacket(meshPacket: MeshPacket) {
    /**
     * Text messages
     */
    if (meshPacket.decoded.data.portnum === PortNumEnum.TEXT_MESSAGE_APP) {
      const text = new TextDecoder().decode(meshPacket.decoded.data.payload);
      log(
        `IMeshDevice.handleMeshPacket`,
        "Sending onTextPacketEvent",
        LogLevelEnum.DEBUG
      );
      this.onTextPacketEvent.next({
        packet: meshPacket,
        data: text,
      });
    } else if (meshPacket.decoded.data.portnum === PortNumEnum.NODEINFO_APP) {
      /**
       * Node Info
       */
      const nodeInfo = NodeInfo.decode(meshPacket.decoded.data.payload);
      log(
        `IMeshDevice.handleMeshPacket`,
        "Sending onNodeInfoPacketEvent",
        LogLevelEnum.DEBUG
      );
      this.onNodeInfoPacketEvent.next({
        packet: meshPacket,
        data: nodeInfo,
      });
    } else if (meshPacket.decoded.data.portnum === PortNumEnum.POSITION_APP) {
      /**
       * Position
       */
      log(
        `IMeshDevice.handleMeshPacket`,
        "Sending onPositionPacketEvent",
        LogLevelEnum.DEBUG
      );
      const position = Position.decode(meshPacket.decoded.data.payload);
      this.onPositionPacketEvent.next({
        packet: meshPacket,
        data: position,
      });
    } else {
      /**
       * All other portnums
       */
      log(
        `IMeshDevice.handleMeshPacket`,
        "Sending onDataPacketEvent",
        LogLevelEnum.DEBUG
      );
      this.onDataPacketEvent.next(meshPacket);
    }
  }

  /**
   * Gets called when a link to the device has been established
   * @param noAutoConfig Disables autoconfiguration
   */
  protected async onConnected(noAutoConfig: boolean) {
    this.isConnected = true;
    this.isReconnecting = false;
    log(
      `IMeshDevice.onConnected`,
      "Sending onConnectionEvent",
      LogLevelEnum.DEBUG
    );
    this.onConnectionEvent.next(ConnectionEventEnum.DEVICE_CONNECTED);

    if (!noAutoConfig) {
      await this.configure().catch((e) => {
        log(`IMeshDevice.onConnected`, e.message, LogLevelEnum.ERROR);
      });
    }
  }

  /**
   * Gets called when a link to the device has been disconnected
   */
  protected onDisconnected() {
    log(
      `IMeshDevice.onDisconnected`,
      "Sending onConnectionEvent",
      LogLevelEnum.DEBUG
    );
    this.onConnectionEvent.next(ConnectionEventEnum.DEVICE_DISCONNECTED);
    this.isConnected = false;
  }
}
