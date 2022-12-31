import { Logger } from "tslog";

import { broadCastNum, minFwVer } from "./constants.js";
import { Protobuf, Types } from "./index.js";
import {
  ChannelNumber,
  clearChannelProps,
  getChannelProps,
  getConfigProps,
  getMetadataProps,
  getModuleConfigProps,
  handleDataPacketProps,
  handleFromRadioProps,
  rebootOTAProps,
  rebootProps,
  requestPositionProps,
  sendPacketProps,
  sendRawProps,
  sendTextProps,
  setChannelProps,
  setConfigProps,
  setModuleConfigProps,
  setOwnerProps,
  setPositionProps,
  shutdownProps,
  traceRouteProps,
  updateDeviceStatusProps
} from "./types.js";
import { EventSystem } from "./utils/eventSystem.js";
import { Queue } from "./utils/queue.js";

/** Base class for connection methods to extend */
export abstract class IMeshDevice {
  /** Abstract property that states the connection type */
  protected abstract connType: string;

  /** Logs to the console and the logging event emitter */
  protected log: Logger<unknown>;

  /** Describes the current state of the device */
  protected deviceStatus: Types.DeviceStatusEnum;

  /** Describes the current state of the device */
  protected isConfigured: boolean;

  /** Are there any settings that have yet to be applied? */
  protected pendingSettingsChanges: boolean;

  /** Device's node number */
  private myNodeInfo: Protobuf.MyNodeInfo;

  /** Randomly generated number to ensure confiuration lockstep */
  public configId: number;

  /**
   * Packert queue, to space out transmissions and routing handle errors and
   * acks
   */
  public queue: Queue;

  public events: EventSystem;

  constructor(configId?: number) {
    this.log = new Logger({
      name: "iMeshDevice",
      prettyLogTemplate:
        "{{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t[{{name}}]\t"
    });

    this.deviceStatus = Types.DeviceStatusEnum.DEVICE_DISCONNECTED;
    this.isConfigured = false;
    this.pendingSettingsChanges = false;
    this.myNodeInfo = Protobuf.MyNodeInfo.create();
    this.configId = configId ?? this.generateRandId();
    this.queue = new Queue();
    this.events = new EventSystem();

    this.events.onDeviceStatus.subscribe((status) => {
      this.deviceStatus = status;
      if (status === Types.DeviceStatusEnum.DEVICE_CONFIGURED)
        this.isConfigured = true;
      else if (status === Types.DeviceStatusEnum.DEVICE_CONFIGURING)
        this.isConfigured = false;
    });

    this.events.onMyNodeInfo.subscribe((myNodeInfo) => {
      this.myNodeInfo = myNodeInfo;
    });

    this.events.onPendingSettingsChange.subscribe((state) => {
      this.pendingSettingsChanges = state;
    });
  }

  /** Abstract method that writes data to the radio */
  protected abstract writeToRadio(data: Uint8Array): Promise<void>;

  /** Abstract method that connects to the radio */
  protected abstract connect(
    parameters: Types.ConnectionParameters
  ): Promise<void>;

  /** Abstract method that disconnects from the radio */
  protected abstract disconnect(): void;

  /** Abstract method that pings the radio */
  protected abstract ping(): Promise<boolean>;

  /**
   * Sends a text over the radio
   *
   * @param {string} text Message to send
   * @param {number} [destinationNum] Node number of the destination node
   * @param {boolean} [wantAck=false] Whether or not acknowledgement is wanted.
   *   Default is `false`
   * @param {Types.channelNumber} [channel=Types.ChannelNumber.PRIMARY] Channel
   *   number to send to. Default is `Types.ChannelNumber.PRIMARY`
   * @returns {Promise<void>}
   */
  public async sendText({
    text,
    destination,
    wantAck,
    channel
  }: sendTextProps): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.sendText],
      `📤 Sending message to ${destination ?? "broadcast"} on channel ${
        channel?.toString() ?? 0
      }`
    );

    const enc = new TextEncoder();

    return this.sendPacket({
      byteData: enc.encode(text),
      portNum: Protobuf.PortNum.TEXT_MESSAGE_APP,
      destination: destination ?? "broadcast",
      wantAck,
      channel,
      echoResponse: true
    });
  }

  /**
   * Sends a text over the radio
   *
   * @param {Protobuf.Waypoint} waypoint Desired waypoint to send
   * @param {number} destinationNum Node number of the destination node
   * @param {boolean} wantAck Whether or not acknowledgement is wanted
   * @param {Types.ChannelNumber} [channel=Types.ChannelNumber.PRIMARY] Channel
   *   to send on. Default is `Types.ChannelNumber.PRIMARY`
   * @returns {Promise<void>}
   */
  public sendWaypoint({
    waypoint,
    destination,
    channel
  }: Types.sendWaypointProps): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.sendWaypoint],
      `📤 Sending waypoint to ${destination} on channel ${
        channel?.toString() ?? 0
      }`
    );

    return this.sendPacket({
      byteData: Protobuf.Waypoint.toBinary(waypoint),
      portNum: Protobuf.PortNum.WAYPOINT_APP,
      destination,
      wantAck: true,
      channel,
      echoResponse: true
    });
  }

  /**
   * Sends packet over the radio
   *
   * @param {Uint8Array} byteData Raw bytes to send
   * @param {Protobuf.PortNum} portNum DataType Enum of protobuf data type
   * @param {number} [destinationNum] Node number of the destination node
   * @param {boolean} [wantAck=false] Whether or not acknowledgement is wanted.
   *   Default is `false`
   * @param {Types.ChannelNumber} [channel=Types.ChannelNumber.PRIMARY] Channel
   *   to send. Default is `Types.ChannelNumber.PRIMARY`
   * @param {boolean} [wantResponse=false] Used for testing, requests recpipient
   *   to respond in kind with the same type of request. Default is `false`
   * @param {boolean} [echoResponse=false] Sends event back to client. Default
   *   is `false`. Default is `false`
   * @param {number} [emoji=0] Used for message reactions. Default is `0`
   * @param {number} [replyId=0] Used to reply to a message. Default is `0`
   */
  public async sendPacket({
    byteData,
    portNum,
    destination,
    wantAck = false,
    channel = Types.ChannelNumber.PRIMARY,
    wantResponse = false,
    echoResponse = false,
    emoji = 0,
    replyId = 0
  }: sendPacketProps): Promise<number> {
    this.log.trace(
      Types.Emitter[Types.Emitter.sendPacket],
      `📤 Sending ${Protobuf.PortNum[portNum]} to ${destination}`
    );

    const meshPacket = Protobuf.MeshPacket.create({
      payloadVariant: {
        decoded: {
          payload: byteData,
          portnum: portNum,
          wantResponse,
          emoji,
          replyId,
          dest: 0, //change this!
          requestId: 0, //change this!
          source: 0 //change this!
        },
        oneofKind: "decoded"
      },
      from: this.myNodeInfo.myNodeNum,
      to:
        destination === "broadcast"
          ? broadCastNum
          : destination === "self"
          ? this.myNodeInfo.myNodeNum
          : destination,
      id: this.generateRandId(),
      wantAck: wantAck,
      channel
    });

    const toRadio = Protobuf.ToRadio.toBinary({
      payloadVariant: {
        packet: meshPacket,
        oneofKind: "packet"
      }
    });

    if (echoResponse) {
      this.handleMeshPacket(meshPacket);
    }
    return this.sendRaw({ id: meshPacket.id, toRadio });
  }

  /**
   * Sends raw packet over the radio
   *
   * @param {number} id Unique packet ID
   * @param {Uint8Array} toRadio Binary data to send
   */
  public async sendRaw({ id, toRadio }: sendRawProps): Promise<number> {
    if (toRadio.length > 512) {
      throw new Error("Message longer than 512 bytes, it will not be sent!");
    } else {
      this.queue.push({
        id,
        data: toRadio
      });

      await this.queue.processQueue(async (data) => {
        await this.writeToRadio(data);
      });

      return this.queue.wait(id);
    }
  }

  /**
   * Writes config to device
   *
   * @param {Protobuf.Config} config Config object
   */
  public async setConfig({ config }: setConfigProps): Promise<number> {
    this.log.debug(Types.Emitter[Types.Emitter.setConfig], `Setting config`);

    const setRadio = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        oneofKind: "setConfig",
        setConfig: config
      }
    });

    return this.sendPacket({
      byteData: setRadio,
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  /**
   * Writes module config to device
   *
   * @param {Protobuf.ModuleConfig} config Module config object
   */
  public async setModuleConfig({
    moduleConfig
  }: setModuleConfigProps): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.setModuleConfig],
      `Setting module config`
    );

    const setRadio = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        oneofKind: "setModuleConfig",
        setModuleConfig: moduleConfig
      }
    });

    return this.sendPacket({
      byteData: setRadio,
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  /**
   * Sets devices owner data
   *
   * @param {Protobuf.User} owner Owner data to apply to the device
   */
  public async setOwner({ owner }: setOwnerProps): Promise<number> {
    this.log.debug(Types.Emitter[Types.Emitter.setOwner], `Setting owner`);

    const setOwner = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        setOwner: owner,
        oneofKind: "setOwner"
      }
    });

    return this.sendPacket({
      byteData: setOwner,
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  /**
   * Sets devices ChannelSettings
   *
   * @param {Protobuf.Channel} channel Channel data to be set
   */
  public async setChannel({ channel }: setChannelProps): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.setChannel],
      `📻 Setting Channel: ${channel.index}`
    );

    const setChannel = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        setChannel: channel,
        oneofKind: "setChannel"
      }
    });

    return this.sendPacket({
      byteData: setChannel,
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  public async setPosition({ position }: setPositionProps): Promise<number> {
    return this.sendPacket({
      byteData: Protobuf.Position.toBinary(position),
      portNum: Protobuf.PortNum.POSITION_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  /**
   * Gets specified channel information from the radio
   *
   * @param {number} index Channel index to be retrieved
   */
  public async getChannel({ index }: getChannelProps): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.getChannel],
      `📻 Requesting Channel: ${index}`
    );

    const getChannelRequest = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        getChannelRequest: index + 1,
        oneofKind: "getChannelRequest"
      }
    });

    return this.sendPacket({
      byteData: getChannelRequest,
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  /**
   * Gets devices config
   *
   * @param {Protobuf.AdminMessage_ConfigType} configType Desired config type to
   *   request
   */
  public async getConfig({ configType }: getConfigProps): Promise<number> {
    this.log.debug(Types.Emitter[Types.Emitter.getConfig], `Requesting config`);

    const getRadioRequest = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        oneofKind: "getConfigRequest",
        getConfigRequest: configType
      }
    });

    return this.sendPacket({
      byteData: getRadioRequest,
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  /**
   * Gets Module config
   *
   * @param {Protobuf.AdminMessage_ModuleConfigType} moduleConfigType Desired
   *   module config type to request
   */
  public async getModuleConfig({
    moduleConfigType
  }: getModuleConfigProps): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.getModuleConfig],
      `Requesting module config`
    );

    const getRadioRequest = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        oneofKind: "getModuleConfigRequest",
        getModuleConfigRequest: moduleConfigType
      }
    });

    return this.sendPacket({
      byteData: getRadioRequest,
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  /** Gets devices Owner */
  public async getOwner(): Promise<number> {
    this.log.debug(Types.Emitter[Types.Emitter.getOwner], `Requesting owner`);

    const getOwnerRequest = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        getOwnerRequest: true,
        oneofKind: "getOwnerRequest"
      }
    });

    return this.sendPacket({
      byteData: getOwnerRequest,
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  /**
   * Gets devices metadata
   *
   * @param {number} nodeNum Destination Node to be queried
   */
  public async getMetadata({ nodeNum }: getMetadataProps): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.getMetadata],
      `Requesting metadata from ${nodeNum}`
    );

    const getDeviceMetricsRequest = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        getDeviceMetadataRequest: true,
        oneofKind: "getDeviceMetadataRequest"
      }
    });

    return this.sendPacket({
      byteData: getDeviceMetricsRequest,
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: nodeNum,
      wantAck: true,
      channel: Types.ChannelNumber.ADMIN,
      wantResponse: true
    });
  }

  /**
   * Clears specific channel with the designated index
   *
   * @param {number} index Channel index to be cleared
   */
  public async clearChannel({ index }: clearChannelProps): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.clearChannel],
      `📻 Clearing Channel ${index}`
    );

    const channel = Protobuf.Channel.create({
      index,
      role: Protobuf.Channel_Role.DISABLED
    });
    const setChannel = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        setChannel: channel,
        oneofKind: "setChannel"
      }
    });

    return this.sendPacket({
      byteData: setChannel,
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  /**
   * Confirms the currently set channels, and prevents changes from reverting
   * after 10 minutes.
   */
  public async confirmSetChannel(): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.confirmSetChannel],
      `📻 Confirming Channel config`
    );

    const confirmSetChannel = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        confirmSetRadio: true,
        oneofKind: "confirmSetRadio"
      }
    });

    return this.sendPacket({
      byteData: confirmSetChannel,
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  public async beginEditSettings(): Promise<number> {
    this.events.onPendingSettingsChange.emit(true);

    const beginEditSettings = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        oneofKind: "beginEditSettings",
        beginEditSettings: true
      }
    });

    return this.sendPacket({
      byteData: beginEditSettings,
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self"
    });
  }

  public async commitEditSettings(): Promise<number> {
    this.events.onPendingSettingsChange.emit(false);

    const commitEditSettings = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        oneofKind: "commitEditSettings",
        commitEditSettings: true
      }
    });

    return this.sendPacket({
      byteData: commitEditSettings,
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self"
    });
  }

  /**
   * Confirms the currently set config, and prevents changes from reverting
   * after 10 minutes.
   */
  public async confirmSetConfig(): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.confirmSetConfig],
      `Confirming config`
    );
    if (!this.pendingSettingsChanges) {
      await this.beginEditSettings();
    }

    const confirmSetRadio = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        confirmSetRadio: true,
        oneofKind: "confirmSetRadio"
      }
    });

    return this.sendPacket({
      byteData: confirmSetRadio,
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  /**
   * Resets the internal NodeDB of the radio, usefull for removing old nodes
   * that no longer exist.
   */
  public async resetPeers(): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.resetPeers],
      `📻 Resetting Peers`
    );

    const resetPeers = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        nodedbReset: 1,
        oneofKind: "nodedbReset"
      }
    });

    return this.sendPacket({
      byteData: resetPeers,
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  /** Shuts down the current node after the specified amount of time has elapsed. */
  public async shutdown({ time }: shutdownProps): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.shutdown],
      `🔌 Shutting down ${time > 0 ? "now" : `in ${time} seconds`}`
    );

    const shutdown = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        shutdownSeconds: time,
        oneofKind: "shutdownSeconds"
      }
    });

    return this.sendPacket({
      byteData: shutdown,
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  /** Reboots the current node after the specified amount of time has elapsed. */
  public async reboot({ time }: rebootProps): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.reboot],
      `🔌 Rebooting node ${time > 0 ? "now" : `in ${time} seconds`}`
    );

    const reboot = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        rebootSeconds: time,
        oneofKind: "rebootSeconds"
      }
    });

    return this.sendPacket({
      byteData: reboot,
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  /**
   * Reboots the current node into OTA mode after the specified amount of time
   * has elapsed.
   */
  public async rebootOTA({ time }: rebootOTAProps): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.rebootOTA],
      `🔌 Rebooting into OTA mode ${time > 0 ? "now" : `in ${time} seconds`}`
    );

    const rebootOTA = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        rebootOtaSeconds: time,
        oneofKind: "rebootOtaSeconds"
      }
    });

    return this.sendPacket({
      byteData: rebootOTA,
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  /** Factory resets the current node */
  public async factoryReset(): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.factoryReset],
      `♻️ Factory resetting node`
    );

    const factoryReset = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        factoryReset: 1,
        oneofKind: "factoryReset"
      }
    });

    return this.sendPacket({
      byteData: factoryReset,
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  /** Triggers the device configure process */
  public configure(): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.configure],
      `⚙️ Requesting device configuration`
    );
    this.updateDeviceStatus({
      status: Types.DeviceStatusEnum.DEVICE_CONFIGURING
    });

    const toRadio = Protobuf.ToRadio.toBinary({
      payloadVariant: {
        wantConfigId: this.configId,
        oneofKind: "wantConfigId"
      }
    });

    return this.sendRaw({ id: this.generateRandId(), toRadio });
  }

  /** Sends a trace route packet to the designated node */
  public async traceRoute({ destination }: traceRouteProps): Promise<number> {
    const routeDiscovery = Protobuf.RouteDiscovery.toBinary({
      route: []
    });

    return this.sendPacket({
      byteData: routeDiscovery,
      portNum: Protobuf.PortNum.ROUTING_APP,
      destination: destination,
      wantAck: true,
      wantResponse: true
    });
  }

  /** Requests position from the designated node */
  public async requestPosition({
    destination
  }: requestPositionProps): Promise<number> {
    return this.sendPacket({
      byteData: new Uint8Array(),
      portNum: Protobuf.PortNum.POSITION_APP,
      destination: destination,
      wantAck: true,
      wantResponse: true
    });
  }

  /**
   * Updates the device status eliminating duplicate status events
   *
   * @param {Types.DeviceStatusEnum} status New device status
   */
  public updateDeviceStatus({ status }: updateDeviceStatusProps): void {
    if (status !== this.deviceStatus) {
      this.events.onDeviceStatus.emit(status);
    }
  }

  /**
   * Generates random packet identifier
   *
   * @returns {number} Random packet ID
   */
  private generateRandId(): number {
    return Math.floor(Math.random() * 1e9);
  }

  /**
   * Gets called whenever a fromRadio message is received from device, returns
   * fromRadio data
   *
   * @param {Uint8Array} fromRadio Uint8Array containing raw radio data
   */
  protected handleFromRadio({ fromRadio }: handleFromRadioProps): void {
    const decodedMessage = Protobuf.FromRadio.fromBinary(fromRadio);
    this.events.onFromRadio.emit(decodedMessage);

    /** @todo Add map here when `all=true` gets fixed. */
    switch (decodedMessage.payloadVariant.oneofKind) {
      case "packet":
        this.handleMeshPacket(decodedMessage.payloadVariant.packet);
        break;

      case "myInfo":
        if (
          parseFloat(decodedMessage.payloadVariant.myInfo.firmwareVersion) <
          minFwVer
        ) {
          this.log.fatal(
            Types.Emitter[Types.Emitter.handleFromRadio],
            `Device firmware outdated. Min supported: ${minFwVer} got : ${decodedMessage.payloadVariant.myInfo.firmwareVersion}`
          );
        }
        this.events.onMyNodeInfo.emit(decodedMessage.payloadVariant.myInfo);
        this.log.info(
          Types.Emitter[Types.Emitter.handleFromRadio],
          "📱 Received Node info for this device"
        );
        break;

      case "nodeInfo":
        this.log.info(
          Types.Emitter[Types.Emitter.handleFromRadio],
          `📱 Received Node Info packet for node: ${decodedMessage.payloadVariant.nodeInfo.num}`
        );

        this.events.onNodeInfoPacket.emit(
          decodedMessage.payloadVariant.nodeInfo
        );

        //TODO: HERE
        if (decodedMessage.payloadVariant.nodeInfo.position) {
          this.events.onPositionPacket.emit({
            id: decodedMessage.id,
            from: decodedMessage.payloadVariant.nodeInfo.num,
            channel: ChannelNumber.PRIMARY,
            data: decodedMessage.payloadVariant.nodeInfo.position
          });
        }

        //TODO: HERE
        if (decodedMessage.payloadVariant.nodeInfo.user) {
          this.events.onUserPacket.emit({
            id: decodedMessage.id,
            from: decodedMessage.payloadVariant.nodeInfo.num,
            channel: ChannelNumber.PRIMARY,
            data: decodedMessage.payloadVariant.nodeInfo.user
          });
        }
        break;

      case "config":
        if (decodedMessage.payloadVariant.config.payloadVariant.oneofKind) {
          this.log.trace(
            Types.Emitter[Types.Emitter.handleFromRadio],
            `💾 Received Config packet of variant: ${decodedMessage.payloadVariant.config.payloadVariant.oneofKind}`
          );
        } else {
          this.log.warn(
            Types.Emitter[Types.Emitter.handleFromRadio],
            `⚠️ Received Config packet of variant: ${"UNK"}`
          );
        }

        this.events.onConfigPacket.emit(decodedMessage.payloadVariant.config);
        break;

      case "logRecord":
        this.log.trace(
          Types.Emitter[Types.Emitter.handleFromRadio],
          "Received onLogRecord"
        );
        this.events.onLogRecord.emit(decodedMessage.payloadVariant.logRecord);
        break;

      case "configCompleteId":
        if (decodedMessage.payloadVariant.configCompleteId !== this.configId) {
          this.log.error(
            Types.Emitter[Types.Emitter.handleFromRadio],
            `❌ Invalid config id reveived from device, exptected ${this.configId} but received ${decodedMessage.payloadVariant.configCompleteId}`
          );
        }

        this.log.info(
          Types.Emitter[Types.Emitter.handleFromRadio],
          `⚙️ Valid config id reveived from device: ${this.configId}`
        );

        this.updateDeviceStatus({
          status: Types.DeviceStatusEnum.DEVICE_CONFIGURED
        });
        break;

      case "rebooted":
        void this.configure().catch(() => {
          // TODO: FIX, workaround for `wantConfigId` not getting acks.
        });
        break;

      case "moduleConfig":
        if (
          decodedMessage.payloadVariant.moduleConfig.payloadVariant.oneofKind
        ) {
          this.log.trace(
            Types.Emitter[Types.Emitter.handleFromRadio],
            `💾 Received Module Config packet of variant: ${decodedMessage.payloadVariant.moduleConfig.payloadVariant.oneofKind}`
          );
        } else {
          this.log.warn(
            Types.Emitter[Types.Emitter.handleFromRadio],
            "⚠️ Received Module Config packet of variant: UNK"
          );
        }

        this.events.onModuleConfigPacket.emit(
          decodedMessage.payloadVariant.moduleConfig
        );
        break;

      case "channel":
        this.log.trace(
          Types.Emitter[Types.Emitter.handleFromRadio],
          `🔐 Received Channel: ${decodedMessage.payloadVariant.channel.index}`
        );

        this.events.onChannelPacket.emit(decodedMessage.payloadVariant.channel);
        break;
    }
  }

  /** Completes all SubEvents */
  public complete(): void {
    this.events.onLogEvent.cancelAll();
    this.events.onFromRadio.cancelAll();
    this.events.onMeshPacket.cancelAll();
    this.events.onMyNodeInfo.cancelAll();
    this.events.onNodeInfoPacket.cancelAll();
    this.events.onUserPacket.cancelAll();
    this.events.onChannelPacket.cancelAll();
    this.events.onConfigPacket.cancelAll();
    this.events.onModuleConfigPacket.cancelAll();
    this.events.onPingPacket.cancelAll();
    this.events.onIpTunnelPacket.cancelAll();
    this.events.onSerialPacket.cancelAll();
    this.events.onStoreForwardPacket.cancelAll();
    this.events.onRangeTestPacket.cancelAll();
    this.events.onTelemetryPacket.cancelAll();
    this.events.onPrivatePacket.cancelAll();
    this.events.onAtakPacket.cancelAll();
    this.events.onRoutingPacket.cancelAll();
    this.events.onPositionPacket.cancelAll();
    this.events.onMessagePacket.cancelAll();
    this.events.onRemoteHardwarePacket.cancelAll();
    this.events.onDeviceStatus.cancelAll();
    this.events.onLogRecord.cancelAll();
    this.events.onMeshHeartbeat.cancelAll();
    this.queue.clear();
  }

  /**
   * Gets called when a MeshPacket is received from device
   *
   * @param {Protobuf.MeshPacket} meshPacket Packet to process
   */
  private handleMeshPacket(meshPacket: Protobuf.MeshPacket): void {
    this.events.onMeshPacket.emit(meshPacket);
    if (meshPacket.from !== this.myNodeInfo.myNodeNum) {
      /**
       * TODO: this shouldn't be called unless the device interracts with the
       * mesh, currently it does.
       */
      this.events.onMeshHeartbeat.emit(new Date());
    }

    switch (meshPacket.payloadVariant.oneofKind) {
      case "decoded":
        this.handleDecodedPacket({
          dataPacket: meshPacket.payloadVariant.decoded,
          meshPacket
        });
        break;

      case "encrypted":
        this.log.debug(
          Types.Emitter[Types.Emitter.handleMeshPacket],
          "Device received encrypted data packet, ignoring."
        );
        break;
    }
  }

  private handleDecodedPacket({
    dataPacket,
    meshPacket
  }: handleDataPacketProps) {
    let adminMessage: Protobuf.AdminMessage | undefined = undefined;
    let routingPacket: Protobuf.Routing | undefined = undefined;

    this.log.trace(
      Types.Emitter[Types.Emitter.handleMeshPacket],
      `📦 Received ${Protobuf.PortNum[dataPacket.portnum]} packet`
    );

    switch (dataPacket.portnum) {
      case Protobuf.PortNum.TEXT_MESSAGE_APP:
        this.events.onMessagePacket.emit({
          id: meshPacket.id,
          from: meshPacket.from,
          channel: meshPacket.channel,
          data: new TextDecoder().decode(dataPacket.payload)
        });
        break;

      case Protobuf.PortNum.REMOTE_HARDWARE_APP:
        this.events.onRemoteHardwarePacket.emit({
          id: meshPacket.id,
          from: meshPacket.from,
          channel: meshPacket.channel,
          data: Protobuf.HardwareMessage.fromBinary(dataPacket.payload)
        });
        break;

      case Protobuf.PortNum.POSITION_APP:
        this.events.onPositionPacket.emit({
          id: meshPacket.id,
          from: meshPacket.from,
          channel: meshPacket.channel,
          data: Protobuf.Position.fromBinary(dataPacket.payload)
        });
        break;

      case Protobuf.PortNum.NODEINFO_APP:
        this.events.onUserPacket.emit({
          id: meshPacket.id,
          from: meshPacket.from,
          channel: meshPacket.channel,
          data: Protobuf.User.fromBinary(dataPacket.payload)
        });
        break;

      case Protobuf.PortNum.ROUTING_APP:
        routingPacket = Protobuf.Routing.fromBinary(dataPacket.payload);

        this.events.onRoutingPacket.emit({
          id: meshPacket.id,
          from: meshPacket.from,
          channel: meshPacket.channel,
          data: routingPacket
        });
        switch (routingPacket.variant.oneofKind) {
          case "errorReason":
            if (
              routingPacket.variant.errorReason === Protobuf.Routing_Error.NONE
            ) {
              this.queue.processAck(dataPacket.requestId);
            } else {
              this.queue.processError({
                id: dataPacket.requestId,
                error: routingPacket.variant.errorReason
              });
            }

            break;
          case "routeReply":
            console.log("routeReply");

            console.log(routingPacket.variant.routeReply);

            break;
          case "routeRequest":
            console.log("routeRequest");

            console.log(routingPacket.variant.routeRequest);

            break;
        }
        break;

      case Protobuf.PortNum.ADMIN_APP:
        adminMessage = Protobuf.AdminMessage.fromBinary(dataPacket.payload);
        switch (adminMessage.payloadVariant.oneofKind) {
          case "getChannelResponse":
            this.events.onChannelPacket.emit(
              adminMessage.payloadVariant.getChannelResponse
            );
            break;
          case "getOwnerResponse":
            this.events.onUserPacket.emit({
              id: meshPacket.id,
              from: meshPacket.from,
              channel: meshPacket.channel,
              data: adminMessage.payloadVariant.getOwnerResponse
            });
            break;
          case "getConfigResponse":
            this.events.onConfigPacket.emit(
              adminMessage.payloadVariant.getConfigResponse
            );
            break;
          case "getModuleConfigResponse":
            this.events.onModuleConfigPacket.emit(
              adminMessage.payloadVariant.getModuleConfigResponse
            );
            break;
          case "getDeviceMetadataResponse":
            this.events.onDeviceMetadataPacket.emit({
              id: meshPacket.id,
              from: meshPacket.from,
              channel: meshPacket.channel,
              data: adminMessage.payloadVariant.getDeviceMetadataResponse
            });
            break;
          default:
            this.log.warn(
              Types.Emitter[Types.Emitter.handleMeshPacket],
              `⚠️ Received unhandled AdminMessage, type ${
                adminMessage.payloadVariant.oneofKind ?? "undefined"
              }`,
              dataPacket.payload
            );
        }
        break;

      case Protobuf.PortNum.TEXT_MESSAGE_COMPRESSED_APP:
        break;

      case Protobuf.PortNum.WAYPOINT_APP:
        this.events.onWaypointPacket.emit({
          id: meshPacket.id,
          from: meshPacket.from,
          channel: meshPacket.channel,
          data: Protobuf.Waypoint.fromBinary(dataPacket.payload)
        });
        break;

      case Protobuf.PortNum.REPLY_APP:
        this.events.onPingPacket.emit({
          id: meshPacket.id,
          from: meshPacket.from,
          channel: meshPacket.channel,
          data: dataPacket.payload //TODO: decode
        });
        break;

      case Protobuf.PortNum.IP_TUNNEL_APP:
        this.events.onIpTunnelPacket.emit({
          id: meshPacket.id,
          from: meshPacket.from,
          channel: meshPacket.channel,
          data: dataPacket.payload
        });
        break;

      case Protobuf.PortNum.SERIAL_APP:
        this.events.onSerialPacket.emit({
          id: meshPacket.id,
          from: meshPacket.from,
          channel: meshPacket.channel,
          data: dataPacket.payload
        });
        break;

      case Protobuf.PortNum.STORE_FORWARD_APP:
        this.events.onStoreForwardPacket.emit({
          id: meshPacket.id,
          from: meshPacket.from,
          channel: meshPacket.channel,
          data: dataPacket.payload
        });
        break;

      case Protobuf.PortNum.RANGE_TEST_APP:
        this.events.onRangeTestPacket.emit({
          id: meshPacket.id,
          from: meshPacket.from,
          channel: meshPacket.channel,
          data: dataPacket.payload
        });
        break;

      case Protobuf.PortNum.TELEMETRY_APP:
        this.events.onTelemetryPacket.emit({
          id: meshPacket.id,
          from: meshPacket.from,
          channel: meshPacket.channel,
          data: Protobuf.Telemetry.fromBinary(dataPacket.payload)
        });
        break;

      case Protobuf.PortNum.PRIVATE_APP:
        this.events.onPrivatePacket.emit({
          id: meshPacket.id,
          from: meshPacket.from,
          channel: meshPacket.channel,
          data: dataPacket.payload
        });
        break;

      case Protobuf.PortNum.ATAK_FORWARDER:
        this.events.onAtakPacket.emit({
          id: meshPacket.id,
          from: meshPacket.from,
          channel: meshPacket.channel,
          data: dataPacket.payload
        });
        break;
    }
  }
}
