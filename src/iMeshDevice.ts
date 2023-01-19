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
  PacketMetadata,
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
    this.myNodeInfo = new Protobuf.MyNodeInfo();
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
      byteData: waypoint.toBinary(),
      portNum: Protobuf.PortNum.WAYPOINT_APP,
      destination,
      wantAck: true,
      channel,
      echoResponse: true
    });
  }

  /**
   * Sends packet over the radio
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

    const meshPacket = new Protobuf.MeshPacket({
      payloadVariant: {
        case: "decoded",
        value: {
          payload: byteData,
          portnum: portNum,
          wantResponse,
          emoji,
          replyId,
          dest: 0, //change this!
          requestId: 0, //change this!
          source: 0 //change this!
        }
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

    const toRadio = new Protobuf.ToRadio({
      payloadVariant: {
        case: "packet",
        value: meshPacket
      }
    });

    if (echoResponse) {
      meshPacket.rxTime = new Date().getTime() / 1000;
      this.handleMeshPacket(meshPacket);
    }
    return this.sendRaw({ id: meshPacket.id, toRadio: toRadio.toBinary() });
  }

  /**
   * Sends raw packet over the radio
   */
  public async sendRaw({
    id = this.generateRandId(),
    toRadio
  }: sendRawProps): Promise<number> {
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
   */
  public async setConfig({ config }: setConfigProps): Promise<number> {
    this.log.debug(Types.Emitter[Types.Emitter.setConfig], `Setting config`);

    const setRadio = new Protobuf.AdminMessage({
      payloadVariant: {
        case: "setConfig",
        value: config
      }
    });

    return this.sendPacket({
      byteData: setRadio.toBinary(),
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  /**
   * Writes module config to device
   */
  public async setModuleConfig({
    moduleConfig
  }: setModuleConfigProps): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.setModuleConfig],
      `Setting module config`
    );

    const setRadio = new Protobuf.AdminMessage({
      payloadVariant: {
        case: "setModuleConfig",
        value: moduleConfig
      }
    });

    return this.sendPacket({
      byteData: setRadio.toBinary(),
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  /**
   * Sets devices owner data
   */
  public async setOwner({ owner }: setOwnerProps): Promise<number> {
    this.log.debug(Types.Emitter[Types.Emitter.setOwner], `Setting owner`);

    const setOwner = new Protobuf.AdminMessage({
      payloadVariant: {
        case: "setOwner",
        value: owner
      }
    });

    return this.sendPacket({
      byteData: setOwner.toBinary(),
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  /**
   * Sets devices ChannelSettings
   */
  public async setChannel({ channel }: setChannelProps): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.setChannel],
      `📻 Setting Channel: ${channel.index}`
    );

    const setChannel = new Protobuf.AdminMessage({
      payloadVariant: {
        case: "setChannel",
        value: channel
      }
    });

    return this.sendPacket({
      byteData: setChannel.toBinary(),
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  public async setPosition({ position }: setPositionProps): Promise<number> {
    return this.sendPacket({
      byteData: position.toBinary(),
      portNum: Protobuf.PortNum.POSITION_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  /**
   * Gets specified channel information from the radio
   */
  public async getChannel({ index }: getChannelProps): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.getChannel],
      `📻 Requesting Channel: ${index}`
    );

    const getChannelRequest = new Protobuf.AdminMessage({
      payloadVariant: {
        case: "getChannelRequest",
        value: index + 1
      }
    });

    return this.sendPacket({
      byteData: getChannelRequest.toBinary(),
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  /**
   * Gets devices config
   *   request
   */
  public async getConfig({ configType }: getConfigProps): Promise<number> {
    this.log.debug(Types.Emitter[Types.Emitter.getConfig], `Requesting config`);

    const getRadioRequest = new Protobuf.AdminMessage({
      payloadVariant: {
        case: "getConfigRequest",
        value: configType
      }
    });

    return this.sendPacket({
      byteData: getRadioRequest.toBinary(),
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  /**
   * Gets Module config
   */
  public async getModuleConfig({
    moduleConfigType
  }: getModuleConfigProps): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.getModuleConfig],
      `Requesting module config`
    );

    const getRadioRequest = new Protobuf.AdminMessage({
      payloadVariant: {
        case: "getModuleConfigRequest",
        value: moduleConfigType
      }
    });

    return this.sendPacket({
      byteData: getRadioRequest.toBinary(),
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  /** Gets devices Owner */
  public async getOwner(): Promise<number> {
    this.log.debug(Types.Emitter[Types.Emitter.getOwner], `Requesting owner`);

    const getOwnerRequest = new Protobuf.AdminMessage({
      payloadVariant: {
        case: "getOwnerRequest",
        value: true
      }
    });

    return this.sendPacket({
      byteData: getOwnerRequest.toBinary(),
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  /**
   * Gets devices metadata
   */
  public async getMetadata({ nodeNum }: getMetadataProps): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.getMetadata],
      `Requesting metadata from ${nodeNum}`
    );

    const getDeviceMetricsRequest = new Protobuf.AdminMessage({
      payloadVariant: {
        case: "getDeviceMetadataRequest",
        value: true
      }
    });

    return this.sendPacket({
      byteData: getDeviceMetricsRequest.toBinary(),
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: nodeNum,
      wantAck: true,
      channel: Types.ChannelNumber.ADMIN,
      wantResponse: true
    });
  }

  /**
   * Clears specific channel with the designated index
   */
  public async clearChannel({ index }: clearChannelProps): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.clearChannel],
      `📻 Clearing Channel ${index}`
    );

    const channel = new Protobuf.Channel({
      index,
      role: Protobuf.Channel_Role.DISABLED
    });
    const setChannel = new Protobuf.AdminMessage({
      payloadVariant: {
        case: "setChannel",
        value: channel
      }
    });

    return this.sendPacket({
      byteData: setChannel.toBinary(),
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

    const confirmSetChannel = new Protobuf.AdminMessage({
      payloadVariant: {
        case: "confirmSetRadio",
        value: true
      }
    });

    return this.sendPacket({
      byteData: confirmSetChannel.toBinary(),
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
      wantResponse: true
    });
  }

  public async beginEditSettings(): Promise<number> {
    this.events.onPendingSettingsChange.emit(true);

    const beginEditSettings = new Protobuf.AdminMessage({
      payloadVariant: {
        case: "beginEditSettings",
        value: true
      }
    });

    return this.sendPacket({
      byteData: beginEditSettings.toBinary(),
      portNum: Protobuf.PortNum.ADMIN_APP,
      destination: "self"
    });
  }

  public async commitEditSettings(): Promise<number> {
    this.events.onPendingSettingsChange.emit(false);

    const commitEditSettings = new Protobuf.AdminMessage({
      payloadVariant: {
        case: "commitEditSettings",
        value: true
      }
    });

    return this.sendPacket({
      byteData: commitEditSettings.toBinary(),
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

    const confirmSetRadio = new Protobuf.AdminMessage({
      payloadVariant: {
        case: "confirmSetRadio",
        value: true
      }
    });

    return this.sendPacket({
      byteData: confirmSetRadio.toBinary(),
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

    const resetPeers = new Protobuf.AdminMessage({
      payloadVariant: {
        case: "nodedbReset",
        value: 1
      }
    });

    return this.sendPacket({
      byteData: resetPeers.toBinary(),
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
      `🔌 Shutting down ${time > 2 ? "now" : `in ${time} seconds`}`
    );

    const shutdown = new Protobuf.AdminMessage({
      payloadVariant: {
        case: "shutdownSeconds",
        value: time
      }
    });

    return this.sendPacket({
      byteData: shutdown.toBinary(),
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

    const reboot = new Protobuf.AdminMessage({
      payloadVariant: {
        case: "rebootSeconds",
        value: time
      }
    });

    return this.sendPacket({
      byteData: reboot.toBinary(),
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

    const rebootOTA = new Protobuf.AdminMessage({
      payloadVariant: {
        case: "rebootOtaSeconds",
        value: time
      }
    });

    return this.sendPacket({
      byteData: rebootOTA.toBinary(),
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

    const factoryReset = new Protobuf.AdminMessage({
      payloadVariant: {
        case: "factoryReset",
        value: 1
      }
    });

    return this.sendPacket({
      byteData: factoryReset.toBinary(),
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

    const toRadio = new Protobuf.ToRadio({
      payloadVariant: {
        case: "wantConfigId",
        value: this.configId
      }
    });

    return this.sendRaw({
      id: this.generateRandId(),
      toRadio: toRadio.toBinary()
    });
  }

  /** Sends a trace route packet to the designated node */
  public async traceRoute({ destination }: traceRouteProps): Promise<number> {
    const routeDiscovery = new Protobuf.RouteDiscovery({
      route: []
    });

    return this.sendPacket({
      byteData: routeDiscovery.toBinary(),
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
    const seed = crypto.getRandomValues(new Uint32Array(1));
    if (!seed[0]) {
      throw new Error("Cannot generate CSPRN");
    }

    return Math.floor(seed[0] * Math.pow(2, -32) * 1e9);
  }

  /**
   * Gets called whenever a fromRadio message is received from device, returns
   * fromRadio data
   */
  protected handleFromRadio({ fromRadio }: handleFromRadioProps): void {
    const decodedMessage = Protobuf.FromRadio.fromBinary(fromRadio);
    this.events.onFromRadio.emit(decodedMessage);

    /** @todo Add map here when `all=true` gets fixed. */
    switch (decodedMessage.payloadVariant.case) {
      case "packet":
        this.handleMeshPacket(decodedMessage.payloadVariant.value);
        break;

      case "myInfo":
        if (
          parseFloat(decodedMessage.payloadVariant.value.firmwareVersion) <
          minFwVer
        ) {
          this.log.fatal(
            Types.Emitter[Types.Emitter.handleFromRadio],
            `Device firmware outdated. Min supported: ${minFwVer} got : ${decodedMessage.payloadVariant.value.firmwareVersion}`
          );
        }
        this.events.onMyNodeInfo.emit(decodedMessage.payloadVariant.value);
        this.log.info(
          Types.Emitter[Types.Emitter.handleFromRadio],
          "📱 Received Node info for this device"
        );
        break;

      case "nodeInfo":
        this.log.info(
          Types.Emitter[Types.Emitter.handleFromRadio],
          `📱 Received Node Info packet for node: ${decodedMessage.payloadVariant.value.num}`
        );

        this.events.onNodeInfoPacket.emit(decodedMessage.payloadVariant.value);

        //TODO: HERE
        if (decodedMessage.payloadVariant.value.position) {
          this.events.onPositionPacket.emit({
            id: decodedMessage.id,
            rxTime: new Date(),
            from: decodedMessage.payloadVariant.value.num,
            channel: ChannelNumber.PRIMARY,
            data: decodedMessage.payloadVariant.value.position
          });
        }

        //TODO: HERE
        if (decodedMessage.payloadVariant.value.user) {
          this.events.onUserPacket.emit({
            id: decodedMessage.id,
            rxTime: new Date(),
            from: decodedMessage.payloadVariant.value.num,
            channel: ChannelNumber.PRIMARY,
            data: decodedMessage.payloadVariant.value.user
          });
        }
        break;

      case "config":
        if (decodedMessage.payloadVariant.value.payloadVariant.case) {
          this.log.trace(
            Types.Emitter[Types.Emitter.handleFromRadio],
            `💾 Received Config packet of variant: ${decodedMessage.payloadVariant.value.payloadVariant.case}`
          );
        } else {
          this.log.warn(
            Types.Emitter[Types.Emitter.handleFromRadio],
            `⚠️ Received Config packet of variant: ${"UNK"}`
          );
        }

        this.events.onConfigPacket.emit(decodedMessage.payloadVariant.value);
        break;

      case "logRecord":
        this.log.trace(
          Types.Emitter[Types.Emitter.handleFromRadio],
          "Received onLogRecord"
        );
        this.events.onLogRecord.emit(decodedMessage.payloadVariant.value);
        break;

      case "configCompleteId":
        if (decodedMessage.payloadVariant.value !== this.configId) {
          this.log.error(
            Types.Emitter[Types.Emitter.handleFromRadio],
            `❌ Invalid config id reveived from device, exptected ${this.configId} but received ${decodedMessage.payloadVariant.value}`
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
        if (decodedMessage.payloadVariant.value.payloadVariant.case) {
          this.log.trace(
            Types.Emitter[Types.Emitter.handleFromRadio],
            `💾 Received Module Config packet of variant: ${decodedMessage.payloadVariant.value.payloadVariant.case}`
          );
        } else {
          this.log.warn(
            Types.Emitter[Types.Emitter.handleFromRadio],
            "⚠️ Received Module Config packet of variant: UNK"
          );
        }

        this.events.onModuleConfigPacket.emit(
          decodedMessage.payloadVariant.value
        );
        break;

      case "channel":
        this.log.trace(
          Types.Emitter[Types.Emitter.handleFromRadio],
          `🔐 Received Channel: ${decodedMessage.payloadVariant.value.index}`
        );

        this.events.onChannelPacket.emit(decodedMessage.payloadVariant.value);
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

    switch (meshPacket.payloadVariant.case) {
      case "decoded":
        this.handleDecodedPacket({
          dataPacket: meshPacket.payloadVariant.value,
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

    const packetMetadata: Omit<PacketMetadata<unknown>, "data"> = {
      id: meshPacket.id,
      rxTime: new Date(meshPacket.rxTime * 1000),
      from: meshPacket.from,
      channel: meshPacket.channel
    };

    this.log.trace(
      Types.Emitter[Types.Emitter.handleMeshPacket],
      `📦 Received ${Protobuf.PortNum[dataPacket.portnum]} packet`
    );

    switch (dataPacket.portnum) {
      case Protobuf.PortNum.TEXT_MESSAGE_APP:
        this.events.onMessagePacket.emit({
          ...packetMetadata,
          data: new TextDecoder().decode(dataPacket.payload)
        });
        break;

      case Protobuf.PortNum.REMOTE_HARDWARE_APP:
        this.events.onRemoteHardwarePacket.emit({
          ...packetMetadata,
          data: Protobuf.HardwareMessage.fromBinary(dataPacket.payload)
        });
        break;

      case Protobuf.PortNum.POSITION_APP:
        this.events.onPositionPacket.emit({
          ...packetMetadata,
          data: Protobuf.Position.fromBinary(dataPacket.payload)
        });
        break;

      case Protobuf.PortNum.NODEINFO_APP:
        this.events.onUserPacket.emit({
          ...packetMetadata,
          data: Protobuf.User.fromBinary(dataPacket.payload)
        });
        break;

      case Protobuf.PortNum.ROUTING_APP:
        routingPacket = Protobuf.Routing.fromBinary(dataPacket.payload);

        this.events.onRoutingPacket.emit({
          ...packetMetadata,
          data: routingPacket
        });
        switch (routingPacket.variant.case) {
          case "errorReason":
            if (routingPacket.variant.value === Protobuf.Routing_Error.NONE) {
              this.queue.processAck(dataPacket.requestId);
            } else {
              this.queue.processError({
                id: dataPacket.requestId,
                error: routingPacket.variant.value
              });
            }

            break;
          case "routeReply":
            console.log("routeReply");

            console.log(routingPacket.variant.value);

            break;
          case "routeRequest":
            console.log("routeRequest");

            console.log(routingPacket.variant.value);

            break;
        }
        break;

      case Protobuf.PortNum.ADMIN_APP:
        adminMessage = Protobuf.AdminMessage.fromBinary(dataPacket.payload);
        switch (adminMessage.payloadVariant.case) {
          case "getChannelResponse":
            this.events.onChannelPacket.emit(adminMessage.payloadVariant.value);
            break;
          case "getOwnerResponse":
            this.events.onUserPacket.emit({
              ...packetMetadata,
              data: adminMessage.payloadVariant.value
            });
            break;
          case "getConfigResponse":
            this.events.onConfigPacket.emit(adminMessage.payloadVariant.value);
            break;
          case "getModuleConfigResponse":
            this.events.onModuleConfigPacket.emit(
              adminMessage.payloadVariant.value
            );
            break;
          case "getDeviceMetadataResponse":
            this.events.onDeviceMetadataPacket.emit({
              ...packetMetadata,
              data: adminMessage.payloadVariant.value
            });
            break;
          default:
            this.log.warn(
              Types.Emitter[Types.Emitter.handleMeshPacket],
              `⚠️ Received unhandled AdminMessage, type ${
                adminMessage.payloadVariant.case ?? "undefined"
              }`,
              dataPacket.payload
            );
        }
        break;

      case Protobuf.PortNum.TEXT_MESSAGE_COMPRESSED_APP:
        break;

      case Protobuf.PortNum.WAYPOINT_APP:
        this.events.onWaypointPacket.emit({
          ...packetMetadata,
          data: Protobuf.Waypoint.fromBinary(dataPacket.payload)
        });
        break;

      case Protobuf.PortNum.REPLY_APP:
        this.events.onPingPacket.emit({
          ...packetMetadata,
          data: dataPacket.payload //TODO: decode
        });
        break;

      case Protobuf.PortNum.IP_TUNNEL_APP:
        this.events.onIpTunnelPacket.emit({
          ...packetMetadata,
          data: dataPacket.payload
        });
        break;

      case Protobuf.PortNum.SERIAL_APP:
        this.events.onSerialPacket.emit({
          ...packetMetadata,
          data: dataPacket.payload
        });
        break;

      case Protobuf.PortNum.STORE_FORWARD_APP:
        this.events.onStoreForwardPacket.emit({
          ...packetMetadata,
          data: dataPacket.payload
        });
        break;

      case Protobuf.PortNum.RANGE_TEST_APP:
        this.events.onRangeTestPacket.emit({
          ...packetMetadata,
          data: dataPacket.payload
        });
        break;

      case Protobuf.PortNum.TELEMETRY_APP:
        this.events.onTelemetryPacket.emit({
          ...packetMetadata,
          data: Protobuf.Telemetry.fromBinary(dataPacket.payload)
        });
        break;

      case Protobuf.PortNum.PRIVATE_APP:
        this.events.onPrivatePacket.emit({
          ...packetMetadata,
          data: dataPacket.payload
        });
        break;

      case Protobuf.PortNum.ATAK_FORWARDER:
        this.events.onAtakPacket.emit({
          ...packetMetadata,
          data: dataPacket.payload
        });
        break;
    }
  }
}
