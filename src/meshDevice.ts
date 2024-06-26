import { Logger } from "tslog";
import { broadcastNum, minFwVer } from "./constants.js";
import * as Protobuf from "./protobufs.js";
import * as Types from "./types.js";
import { EventSystem, Queue, Xmodem } from "./utils/index.js";

/** Base class for connection methods to extend */
export abstract class MeshDevice {
  /** Abstract property that states the connection type */
  protected abstract connType: Types.ConnectionTypeName;

  protected abstract portId: string;

  /** Logs to the console and the logging event emitter */
  protected log: Logger<unknown>;

  /** Describes the current state of the device */
  protected deviceStatus: Types.DeviceStatusEnum;

  /** Describes the current state of the device */
  protected isConfigured: boolean;

  /** Are there any settings that have yet to be applied? */
  protected pendingSettingsChanges: boolean;

  /** Device's node number */
  private myNodeInfo: Protobuf.Mesh.MyNodeInfo;

  /** Randomly generated number to ensure confiuration lockstep */
  public configId: number;

  /**
   * Packert queue, to space out transmissions and routing handle errors and
   * acks
   */
  public queue: Queue;

  public events: EventSystem;

  public xModem: Xmodem;

  constructor(configId?: number) {
    this.log = new Logger({
      name: "iMeshDevice",
      prettyLogTemplate:
        "{{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t[{{name}}]\t",
    });

    this.deviceStatus = Types.DeviceStatusEnum.DeviceDisconnected;
    this.isConfigured = false;
    this.pendingSettingsChanges = false;
    this.myNodeInfo = new Protobuf.Mesh.MyNodeInfo();
    this.configId = configId ?? this.generateRandId();
    this.queue = new Queue();
    this.events = new EventSystem();
    this.xModem = new Xmodem(this.sendRaw.bind(this)); //TODO: try wihtout bind

    this.events.onDeviceStatus.subscribe((status) => {
      this.deviceStatus = status;
      if (status === Types.DeviceStatusEnum.DeviceConfigured) {
        this.isConfigured = true;
      } else if (status === Types.DeviceStatusEnum.DeviceConfiguring) {
        this.isConfigured = false;
      }
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
    parameters: Types.ConnectionParameters,
  ): Promise<void>;

  /** Abstract method that disconnects from the radio */
  protected abstract disconnect(): void;

  /** Abstract method that pings the radio */
  protected abstract ping(): Promise<boolean>;

  /**
   * Sends a text over the radio
   */
  public async sendText(
    text: string,
    destination?: Types.Destination,
    wantAck?: boolean,
    channel?: Types.ChannelNumber,
  ): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.SendText],
      `📤 Sending message to ${destination ?? "broadcast"} on channel ${
        channel?.toString() ?? 0
      }`,
    );

    const enc = new TextEncoder();

    return await this.sendPacket(
      enc.encode(text),
      Protobuf.Portnums.PortNum.TEXT_MESSAGE_APP,
      destination ?? "broadcast",
      channel,
      wantAck,
      false,
      true,
    );
  }

  /**
   * Sends a text over the radio
   */
  public sendWaypoint(
    waypointMessage: Protobuf.Mesh.Waypoint,
    destination: Types.Destination,
    channel?: Types.ChannelNumber,
  ): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.SendWaypoint],
      `📤 Sending waypoint to ${destination} on channel ${
        channel?.toString() ?? 0
      }`,
    );

    waypointMessage.id = this.generateRandId();

    return this.sendPacket(
      waypointMessage.toBinary(),
      Protobuf.Portnums.PortNum.WAYPOINT_APP,
      destination,
      channel,
      true,
      false,
    );
  }

  /**
   * Sends packet over the radio
   */
  public async sendPacket(
    byteData: Uint8Array,
    portNum: Protobuf.Portnums.PortNum,
    destination: Types.Destination,
    channel: Types.ChannelNumber = Types.ChannelNumber.Primary,
    wantAck = true,
    wantResponse = true,
    echoResponse = false,
    replyId?: number,
    emoji?: number,
  ): Promise<number> {
    this.log.trace(
      Types.Emitter[Types.Emitter.SendPacket],
      `📤 Sending ${Protobuf.Portnums.PortNum[portNum]} to ${destination}`,
    );

    const meshPacket = new Protobuf.Mesh.MeshPacket({
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
          source: 0, //change this!
        },
      },
      from: this.myNodeInfo.myNodeNum,
      to:
        destination === "broadcast"
          ? broadcastNum
          : destination === "self"
            ? this.myNodeInfo.myNodeNum
            : destination,
      id: this.generateRandId(),
      wantAck: wantAck,
      channel,
    });

    const toRadioMessage = new Protobuf.Mesh.ToRadio({
      payloadVariant: {
        case: "packet",
        value: meshPacket,
      },
    });

    if (echoResponse) {
      meshPacket.rxTime = Math.trunc(new Date().getTime() / 1000);
      this.handleMeshPacket(meshPacket);
    }
    return await this.sendRaw(toRadioMessage.toBinary(), meshPacket.id);
  }

  /**
   * Sends raw packet over the radio
   */
  public async sendRaw(
    toRadio: Uint8Array,
    id: number = this.generateRandId(),
  ): Promise<number> {
    if (toRadio.length > 512) {
      throw new Error("Message longer than 512 bytes, it will not be sent!");
    }
    this.queue.push({
      id,
      data: toRadio,
    });

    await this.queue.processQueue(async (data) => {
      await this.writeToRadio(data);
    });

    return this.queue.wait(id);
  }

  /**
   * Writes config to device
   */
  public async setConfig(config: Protobuf.Config.Config): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.SetConfig],
      `⚙️ Setting config, Variant: ${config.payloadVariant.case ?? "Unknown"}`,
    );

    if (!this.pendingSettingsChanges) {
      await this.beginEditSettings();
    }

    const configMessage = new Protobuf.Admin.AdminMessage({
      payloadVariant: {
        case: "setConfig",
        value: config,
      },
    });

    return this.sendPacket(
      configMessage.toBinary(),
      Protobuf.Portnums.PortNum.ADMIN_APP,
      "self",
    );
  }

  /**
   * Writes module config to device
   */
  public async setModuleConfig(
    moduleConfig: Protobuf.ModuleConfig.ModuleConfig,
  ): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.SetModuleConfig],
      "⚙️ Setting module config",
    );

    const moduleConfigMessage = new Protobuf.Admin.AdminMessage({
      payloadVariant: {
        case: "setModuleConfig",
        value: moduleConfig,
      },
    });

    return await this.sendPacket(
      moduleConfigMessage.toBinary(),
      Protobuf.Portnums.PortNum.ADMIN_APP,
      "self",
    );
  }

  /**
   * Sets devices owner data
   */
  public async setOwner(owner: Protobuf.Mesh.User): Promise<number> {
    this.log.debug(Types.Emitter[Types.Emitter.SetOwner], "👤 Setting owner");

    const setOwnerMessage = new Protobuf.Admin.AdminMessage({
      payloadVariant: {
        case: "setOwner",
        value: owner,
      },
    });

    return await this.sendPacket(
      setOwnerMessage.toBinary(),
      Protobuf.Portnums.PortNum.ADMIN_APP,
      "self",
    );
  }

  /**
   * Sets devices ChannelSettings
   */
  public async setChannel(channel: Protobuf.Channel.Channel): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.SetChannel],
      `📻 Setting Channel: ${channel.index}`,
    );

    const setChannelMessage = new Protobuf.Admin.AdminMessage({
      payloadVariant: {
        case: "setChannel",
        value: channel,
      },
    });

    return await this.sendPacket(
      setChannelMessage.toBinary(),
      Protobuf.Portnums.PortNum.ADMIN_APP,
      "self",
    );
  }

  public async setPosition(
    positionMessage: Protobuf.Mesh.Position,
  ): Promise<number> {
    return await this.sendPacket(
      positionMessage.toBinary(),
      Protobuf.Portnums.PortNum.POSITION_APP,
      "self",
    );
  }

  /**
   * Gets specified channel information from the radio
   */
  public async getChannel(index: number): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.GetChannel],
      `📻 Requesting Channel: ${index}`,
    );

    const getChannelRequestMessage = new Protobuf.Admin.AdminMessage({
      payloadVariant: {
        case: "getChannelRequest",
        value: index + 1,
      },
    });

    return await this.sendPacket(
      getChannelRequestMessage.toBinary(),
      Protobuf.Portnums.PortNum.ADMIN_APP,
      "self",
    );
  }

  /**
   * Gets devices config
   *   request
   */
  public async getConfig(
    configType: Protobuf.Admin.AdminMessage_ConfigType,
  ): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.GetConfig],
      "⚙️ Requesting config",
    );

    const getRadioRequestMessage = new Protobuf.Admin.AdminMessage({
      payloadVariant: {
        case: "getConfigRequest",
        value: configType,
      },
    });

    return await this.sendPacket(
      getRadioRequestMessage.toBinary(),
      Protobuf.Portnums.PortNum.ADMIN_APP,
      "self",
    );
  }

  /**
   * Gets Module config
   */
  public async getModuleConfig(
    moduleConfigType: Protobuf.Admin.AdminMessage_ModuleConfigType,
  ): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.GetModuleConfig],
      "⚙️ Requesting module config",
    );

    const getRadioRequestMessage = new Protobuf.Admin.AdminMessage({
      payloadVariant: {
        case: "getModuleConfigRequest",
        value: moduleConfigType,
      },
    });

    return await this.sendPacket(
      getRadioRequestMessage.toBinary(),
      Protobuf.Portnums.PortNum.ADMIN_APP,
      "self",
    );
  }

  /** Gets devices Owner */
  public async getOwner(): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.GetOwner],
      "👤 Requesting owner",
    );

    const getOwnerRequestMessage = new Protobuf.Admin.AdminMessage({
      payloadVariant: {
        case: "getOwnerRequest",
        value: true,
      },
    });

    return await this.sendPacket(
      getOwnerRequestMessage.toBinary(),
      Protobuf.Portnums.PortNum.ADMIN_APP,
      "self",
    );
  }

  /**
   * Gets devices metadata
   */
  public async getMetadata(nodeNum: number): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.GetMetadata],
      `🏷️ Requesting metadata from ${nodeNum}`,
    );

    const getDeviceMetricsRequestMessage = new Protobuf.Admin.AdminMessage({
      payloadVariant: {
        case: "getDeviceMetadataRequest",
        value: true,
      },
    });

    return await this.sendPacket(
      getDeviceMetricsRequestMessage.toBinary(),
      Protobuf.Portnums.PortNum.ADMIN_APP,
      nodeNum,
      Types.ChannelNumber.Admin,
    );
  }

  /**
   * Clears specific channel with the designated index
   */
  public async clearChannel(index: number): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.ClearChannel],
      `📻 Clearing Channel ${index}`,
    );

    const channel = new Protobuf.Channel.Channel({
      index,
      role: Protobuf.Channel.Channel_Role.DISABLED,
    });
    const setChannelMessage = new Protobuf.Admin.AdminMessage({
      payloadVariant: {
        case: "setChannel",
        value: channel,
      },
    });

    return await this.sendPacket(
      setChannelMessage.toBinary(),
      Protobuf.Portnums.PortNum.ADMIN_APP,
      "self",
    );
  }

  private async beginEditSettings(): Promise<number> {
    this.events.onPendingSettingsChange.dispatch(true);

    const beginEditSettings = new Protobuf.Admin.AdminMessage({
      payloadVariant: {
        case: "beginEditSettings",
        value: true,
      },
    });

    return await this.sendPacket(
      beginEditSettings.toBinary(),
      Protobuf.Portnums.PortNum.ADMIN_APP,
      "self",
    );
  }

  public async commitEditSettings(): Promise<number> {
    this.events.onPendingSettingsChange.dispatch(false);

    const commitEditSettings = new Protobuf.Admin.AdminMessage({
      payloadVariant: {
        case: "commitEditSettings",
        value: true,
      },
    });

    return await this.sendPacket(
      commitEditSettings.toBinary(),
      Protobuf.Portnums.PortNum.ADMIN_APP,
      "self",
    );
  }

  /**
   * Resets the internal NodeDB of the radio, usefull for removing old nodes
   * that no longer exist.
   */
  public async resetNodes(): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.ResetNodes],
      "📻 Resetting NodeDB",
    );

    const resetNodes = new Protobuf.Admin.AdminMessage({
      payloadVariant: {
        case: "nodedbReset",
        value: 1,
      },
    });

    return await this.sendPacket(
      resetNodes.toBinary(),
      Protobuf.Portnums.PortNum.ADMIN_APP,
      "self",
    );
  }

  /**
   * Removes a node from the internal NodeDB of the radio by node number
   */
  public async removeNodeByNum(nodeNum: number): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.RemoveNodeByNum],
      `📻 Removing Node ${nodeNum} from NodeDB`,
    );

    const removeNodeByNum = new Protobuf.Admin.AdminMessage({
      payloadVariant: {
        case: "removeByNodenum",
        value: nodeNum,
      },
    });

    return await this.sendPacket(
      removeNodeByNum.toBinary(),
      Protobuf.Portnums.PortNum.ADMIN_APP,
      "self",
    );
  }

  /** Shuts down the current node after the specified amount of time has elapsed. */
  public async shutdown(time: number): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.Shutdown],
      `🔌 Shutting down ${time > 2 ? "now" : `in ${time} seconds`}`,
    );

    const shutdown = new Protobuf.Admin.AdminMessage({
      payloadVariant: {
        case: "shutdownSeconds",
        value: time,
      },
    });

    return await this.sendPacket(
      shutdown.toBinary(),
      Protobuf.Portnums.PortNum.ADMIN_APP,
      "self",
    );
  }

  /** Reboots the current node after the specified amount of time has elapsed. */
  public async reboot(time: number): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.Reboot],
      `🔌 Rebooting node ${time > 0 ? "now" : `in ${time} seconds`}`,
    );

    const reboot = new Protobuf.Admin.AdminMessage({
      payloadVariant: {
        case: "rebootSeconds",
        value: time,
      },
    });

    return await this.sendPacket(
      reboot.toBinary(),
      Protobuf.Portnums.PortNum.ADMIN_APP,
      "self",
    );
  }

  /**
   * Reboots the current node into OTA mode after the specified amount of time
   * has elapsed.
   */
  public async rebootOta(time: number): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.RebootOta],
      `🔌 Rebooting into OTA mode ${time > 0 ? "now" : `in ${time} seconds`}`,
    );

    const rebootOta = new Protobuf.Admin.AdminMessage({
      payloadVariant: {
        case: "rebootOtaSeconds",
        value: time,
      },
    });

    return await this.sendPacket(
      rebootOta.toBinary(),
      Protobuf.Portnums.PortNum.ADMIN_APP,
      "self",
    );
  }

  /** Factory resets the current node */
  public async factoryReset(): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.FactoryReset],
      "♻️ Factory resetting node",
    );

    const factoryReset = new Protobuf.Admin.AdminMessage({
      payloadVariant: {
        case: "factoryReset",
        value: 1,
      },
    });

    return await this.sendPacket(
      factoryReset.toBinary(),
      Protobuf.Portnums.PortNum.ADMIN_APP,
      "self",
    );
  }

  /** Triggers the device configure process */
  public configure(): Promise<number> {
    this.log.debug(
      Types.Emitter[Types.Emitter.Configure],
      "⚙️ Requesting device configuration",
    );
    this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceConfiguring);

    const toRadio = new Protobuf.Mesh.ToRadio({
      payloadVariant: {
        case: "wantConfigId",
        value: this.configId,
      },
    });

    return this.sendRaw(toRadio.toBinary());
  }

  /** Sends a trace route packet to the designated node */
  public async traceRoute(destination: number): Promise<number> {
    const routeDiscovery = new Protobuf.Mesh.RouteDiscovery({
      route: [],
    });

    return await this.sendPacket(
      routeDiscovery.toBinary(),
      Protobuf.Portnums.PortNum.TRACEROUTE_APP,
      destination,
    );
  }

  /** Requests position from the designated node */
  public async requestPosition(destination: number): Promise<number> {
    return await this.sendPacket(
      new Uint8Array(),
      Protobuf.Portnums.PortNum.POSITION_APP,
      destination,
    );
  }

  /**
   * Updates the device status eliminating duplicate status events
   */
  public updateDeviceStatus(status: Types.DeviceStatusEnum): void {
    if (status !== this.deviceStatus) {
      this.events.onDeviceStatus.dispatch(status);
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

    return Math.floor(seed[0] * 2 ** -32 * 1e9);
  }

  /**
   * Gets called whenever a fromRadio message is received from device, returns
   * fromRadio data
   */
  protected handleFromRadio(fromRadio: Uint8Array): void {
    const decodedMessage = Protobuf.Mesh.FromRadio.fromBinary(fromRadio);
    this.events.onFromRadio.dispatch(decodedMessage);

    /** @todo Add map here when `all=true` gets fixed. */
    switch (decodedMessage.payloadVariant.case) {
      case "packet": {
        this.handleMeshPacket(decodedMessage.payloadVariant.value);
        break;
      }

      case "myInfo": {
        this.events.onMyNodeInfo.dispatch(decodedMessage.payloadVariant.value);
        this.log.info(
          Types.Emitter[Types.Emitter.HandleFromRadio],
          "📱 Received Node info for this device",
        );
        break;
      }

      case "nodeInfo": {
        this.log.info(
          Types.Emitter[Types.Emitter.HandleFromRadio],
          `📱 Received Node Info packet for node: ${decodedMessage.payloadVariant.value.num}`,
        );

        this.events.onNodeInfoPacket.dispatch(
          decodedMessage.payloadVariant.value,
        );

        //TODO: HERE
        if (decodedMessage.payloadVariant.value.position) {
          this.events.onPositionPacket.dispatch({
            id: decodedMessage.id,
            rxTime: new Date(),
            from: decodedMessage.payloadVariant.value.num,
            to: decodedMessage.payloadVariant.value.num,
            type: "direct",
            channel: Types.ChannelNumber.Primary,
            data: decodedMessage.payloadVariant.value.position,
          });
        }

        //TODO: HERE
        if (decodedMessage.payloadVariant.value.user) {
          this.events.onUserPacket.dispatch({
            id: decodedMessage.id,
            rxTime: new Date(),
            from: decodedMessage.payloadVariant.value.num,
            to: decodedMessage.payloadVariant.value.num,
            type: "direct",
            channel: Types.ChannelNumber.Primary,
            data: decodedMessage.payloadVariant.value.user,
          });
        }
        break;
      }

      case "config": {
        if (decodedMessage.payloadVariant.value.payloadVariant.case) {
          this.log.trace(
            Types.Emitter[Types.Emitter.HandleFromRadio],
            `💾 Received Config packet of variant: ${decodedMessage.payloadVariant.value.payloadVariant.case}`,
          );
        } else {
          this.log.warn(
            Types.Emitter[Types.Emitter.HandleFromRadio],
            `⚠️ Received Config packet of variant: ${"UNK"}`,
          );
        }

        this.events.onConfigPacket.dispatch(
          decodedMessage.payloadVariant.value,
        );
        break;
      }

      case "logRecord": {
        this.log.trace(
          Types.Emitter[Types.Emitter.HandleFromRadio],
          "Received onLogRecord",
        );
        this.events.onLogRecord.dispatch(decodedMessage.payloadVariant.value);
        break;
      }

      case "configCompleteId": {
        if (decodedMessage.payloadVariant.value !== this.configId) {
          this.log.error(
            Types.Emitter[Types.Emitter.HandleFromRadio],
            `❌ Invalid config id received from device, expected ${this.configId} but received ${decodedMessage.payloadVariant.value}`,
          );
        }

        this.log.info(
          Types.Emitter[Types.Emitter.HandleFromRadio],
          `⚙️ Valid config id received from device: ${this.configId}`,
        );

        this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceConfigured);
        break;
      }

      case "rebooted": {
        this.configure().catch(() => {
          // TODO: FIX, workaround for `wantConfigId` not getting acks.
        });
        break;
      }

      case "moduleConfig": {
        if (decodedMessage.payloadVariant.value.payloadVariant.case) {
          this.log.trace(
            Types.Emitter[Types.Emitter.HandleFromRadio],
            `💾 Received Module Config packet of variant: ${decodedMessage.payloadVariant.value.payloadVariant.case}`,
          );
        } else {
          this.log.warn(
            Types.Emitter[Types.Emitter.HandleFromRadio],
            "⚠️ Received Module Config packet of variant: UNK",
          );
        }

        this.events.onModuleConfigPacket.dispatch(
          decodedMessage.payloadVariant.value,
        );
        break;
      }

      case "channel": {
        this.log.trace(
          Types.Emitter[Types.Emitter.HandleFromRadio],
          `🔐 Received Channel: ${decodedMessage.payloadVariant.value.index}`,
        );

        this.events.onChannelPacket.dispatch(
          decodedMessage.payloadVariant.value,
        );
        break;
      }

      case "queueStatus": {
        this.log.trace(
          Types.Emitter[Types.Emitter.HandleFromRadio],
          `🚧 Received Queue Status: ${decodedMessage.payloadVariant.value}`,
        );

        this.events.onQueueStatus.dispatch(decodedMessage.payloadVariant.value);
        break;
      }

      case "xmodemPacket": {
        this.xModem.handlePacket(decodedMessage.payloadVariant.value);
        break;
      }

      case "metadata": {
        if (
          Number.parseFloat(
            decodedMessage.payloadVariant.value.firmwareVersion,
          ) < minFwVer
        ) {
          this.log.fatal(
            Types.Emitter[Types.Emitter.HandleFromRadio],
            `Device firmware outdated. Min supported: ${minFwVer} got : ${decodedMessage.payloadVariant.value.firmwareVersion}`,
          );
        }
        this.log.debug(
          Types.Emitter[Types.Emitter.GetMetadata],
          "🏷️ Received metadata packet",
        );

        this.events.onDeviceMetadataPacket.dispatch({
          id: decodedMessage.id,
          rxTime: new Date(),
          from: 0,
          to: 0,
          type: "direct",
          channel: Types.ChannelNumber.Primary,
          data: decodedMessage.payloadVariant.value,
        });
        break;
      }

      case "mqttClientProxyMessage": {
        break;
      }

      default: {
        this.log.warn(
          Types.Emitter[Types.Emitter.HandleFromRadio],
          `⚠️ Unhandled payload variant: ${decodedMessage.payloadVariant.case}`,
        );
      }
    }
  }

  /** Completes all Events */
  public complete(): void {
    this.queue.clear();
  }

  /**
   * Gets called when a MeshPacket is received from device
   */
  private handleMeshPacket(meshPacket: Protobuf.Mesh.MeshPacket): void {
    this.events.onMeshPacket.dispatch(meshPacket);
    if (meshPacket.from !== this.myNodeInfo.myNodeNum) {
      /**
       * TODO: this shouldn't be called unless the device interracts with the
       * mesh, currently it does.
       */
      this.events.onMeshHeartbeat.dispatch(new Date());
    }

    switch (meshPacket.payloadVariant.case) {
      case "decoded": {
        this.handleDecodedPacket(meshPacket.payloadVariant.value, meshPacket);
        break;
      }

      case "encrypted": {
        this.log.debug(
          Types.Emitter[Types.Emitter.HandleMeshPacket],
          "🔐 Device received encrypted data packet, ignoring.",
        );
        break;
      }

      default:
        throw new Error(`Unhandled case ${meshPacket.payloadVariant.case}`);
    }
  }

  private handleDecodedPacket(
    dataPacket: Protobuf.Mesh.Data,
    meshPacket: Protobuf.Mesh.MeshPacket,
  ) {
    let adminMessage: Protobuf.Admin.AdminMessage | undefined = undefined;
    let routingPacket: Protobuf.Mesh.Routing | undefined = undefined;

    const packetMetadata: Omit<Types.PacketMetadata<unknown>, "data"> = {
      id: meshPacket.id,
      rxTime: new Date(meshPacket.rxTime * 1000),
      type: meshPacket.to === broadcastNum ? "broadcast" : "direct",
      from: meshPacket.from,
      to: meshPacket.to,
      channel: meshPacket.channel,
    };

    this.log.trace(
      Types.Emitter[Types.Emitter.HandleMeshPacket],
      `📦 Received ${Protobuf.Portnums.PortNum[dataPacket.portnum]} packet`,
    );

    switch (dataPacket.portnum) {
      case Protobuf.Portnums.PortNum.TEXT_MESSAGE_APP: {
        this.events.onMessagePacket.dispatch({
          ...packetMetadata,
          data: new TextDecoder().decode(dataPacket.payload),
        });
        break;
      }

      case Protobuf.Portnums.PortNum.REMOTE_HARDWARE_APP: {
        this.events.onRemoteHardwarePacket.dispatch({
          ...packetMetadata,
          data: Protobuf.RemoteHardware.HardwareMessage.fromBinary(
            dataPacket.payload,
          ),
        });
        break;
      }

      case Protobuf.Portnums.PortNum.POSITION_APP: {
        this.events.onPositionPacket.dispatch({
          ...packetMetadata,
          data: Protobuf.Mesh.Position.fromBinary(dataPacket.payload),
        });
        break;
      }

      case Protobuf.Portnums.PortNum.NODEINFO_APP: {
        this.events.onUserPacket.dispatch({
          ...packetMetadata,
          data: Protobuf.Mesh.User.fromBinary(dataPacket.payload),
        });
        break;
      }

      case Protobuf.Portnums.PortNum.ROUTING_APP: {
        routingPacket = Protobuf.Mesh.Routing.fromBinary(dataPacket.payload);

        this.events.onRoutingPacket.dispatch({
          ...packetMetadata,
          data: routingPacket,
        });
        switch (routingPacket.variant.case) {
          case "errorReason": {
            if (
              routingPacket.variant.value === Protobuf.Mesh.Routing_Error.NONE
            ) {
              this.queue.processAck(dataPacket.requestId);
            } else {
              this.queue.processError({
                id: dataPacket.requestId,
                error: routingPacket.variant.value,
              });
            }

            break;
          }
          case "routeReply": {
            break;
          }
          case "routeRequest": {
            break;
          }

          default: {
            throw new Error(`Unhandled case ${routingPacket.variant.case}`);
          }
        }
        break;
      }

      case Protobuf.Portnums.PortNum.ADMIN_APP: {
        adminMessage = Protobuf.Admin.AdminMessage.fromBinary(
          dataPacket.payload,
        );
        switch (adminMessage.payloadVariant.case) {
          case "getChannelResponse": {
            this.events.onChannelPacket.dispatch(
              adminMessage.payloadVariant.value,
            );
            break;
          }
          case "getOwnerResponse": {
            this.events.onUserPacket.dispatch({
              ...packetMetadata,
              data: adminMessage.payloadVariant.value,
            });
            break;
          }
          case "getConfigResponse": {
            this.events.onConfigPacket.dispatch(
              adminMessage.payloadVariant.value,
            );
            break;
          }
          case "getModuleConfigResponse": {
            this.events.onModuleConfigPacket.dispatch(
              adminMessage.payloadVariant.value,
            );
            break;
          }
          case "getDeviceMetadataResponse": {
            this.log.debug(
              Types.Emitter[Types.Emitter.GetMetadata],
              `🏷️ Received metadata packet from ${dataPacket.source}`,
            );

            this.events.onDeviceMetadataPacket.dispatch({
              ...packetMetadata,
              data: adminMessage.payloadVariant.value,
            });
            break;
          }
          default: {
            this.log.error(
              Types.Emitter[Types.Emitter.HandleMeshPacket],
              `⚠️ Received unhandled AdminMessage, type ${
                adminMessage.payloadVariant.case ?? "undefined"
              }`,
              dataPacket.payload,
            );
          }
        }
        break;
      }

      case Protobuf.Portnums.PortNum.WAYPOINT_APP: {
        this.events.onWaypointPacket.dispatch({
          ...packetMetadata,
          data: Protobuf.Mesh.Waypoint.fromBinary(dataPacket.payload),
        });
        break;
      }

      case Protobuf.Portnums.PortNum.AUDIO_APP: {
        this.events.onAudioPacket.dispatch({
          ...packetMetadata,
          data: dataPacket.payload,
        });
        break;
      }

      case Protobuf.Portnums.PortNum.DETECTION_SENSOR_APP: {
        this.events.onDetectionSensorPacket.dispatch({
          ...packetMetadata,
          data: dataPacket.payload,
        });
        break;
      }

      case Protobuf.Portnums.PortNum.REPLY_APP: {
        this.events.onPingPacket.dispatch({
          ...packetMetadata,
          data: dataPacket.payload, //TODO: decode
        });
        break;
      }

      case Protobuf.Portnums.PortNum.IP_TUNNEL_APP: {
        this.events.onIpTunnelPacket.dispatch({
          ...packetMetadata,
          data: dataPacket.payload,
        });
        break;
      }

      case Protobuf.Portnums.PortNum.PAXCOUNTER_APP: {
        this.events.onPaxcounterPacket.dispatch({
          ...packetMetadata,
          data: Protobuf.PaxCount.Paxcount.fromBinary(dataPacket.payload),
        });
        break;
      }

      case Protobuf.Portnums.PortNum.SERIAL_APP: {
        this.events.onSerialPacket.dispatch({
          ...packetMetadata,
          data: dataPacket.payload,
        });
        break;
      }

      case Protobuf.Portnums.PortNum.STORE_FORWARD_APP: {
        this.events.onStoreForwardPacket.dispatch({
          ...packetMetadata,
          data: dataPacket.payload,
        });
        break;
      }

      case Protobuf.Portnums.PortNum.RANGE_TEST_APP: {
        this.events.onRangeTestPacket.dispatch({
          ...packetMetadata,
          data: dataPacket.payload,
        });
        break;
      }

      case Protobuf.Portnums.PortNum.TELEMETRY_APP: {
        this.events.onTelemetryPacket.dispatch({
          ...packetMetadata,
          data: Protobuf.Telemetry.Telemetry.fromBinary(dataPacket.payload),
        });
        break;
      }

      case Protobuf.Portnums.PortNum.ZPS_APP: {
        this.events.onZpsPacket.dispatch({
          ...packetMetadata,
          data: dataPacket.payload,
        });
        break;
      }

      case Protobuf.Portnums.PortNum.SIMULATOR_APP: {
        this.events.onSimulatorPacket.dispatch({
          ...packetMetadata,
          data: dataPacket.payload,
        });
        break;
      }

      case Protobuf.Portnums.PortNum.TRACEROUTE_APP: {
        this.events.onTraceRoutePacket.dispatch({
          ...packetMetadata,
          data: Protobuf.Mesh.RouteDiscovery.fromBinary(dataPacket.payload),
        });
        break;
      }

      case Protobuf.Portnums.PortNum.NEIGHBORINFO_APP: {
        this.events.onNeighborInfoPacket.dispatch({
          ...packetMetadata,
          data: Protobuf.Mesh.NeighborInfo.fromBinary(dataPacket.payload),
        });
        break;
      }

      case Protobuf.Portnums.PortNum.ATAK_PLUGIN: {
        this.events.onAtakPluginPacket.dispatch({
          ...packetMetadata,
          data: dataPacket.payload,
        });
        break;
      }

      case Protobuf.Portnums.PortNum.MAP_REPORT_APP: {
        this.events.onMapReportPacket.dispatch({
          ...packetMetadata,
          data: dataPacket.payload,
        });
        break;
      }

      case Protobuf.Portnums.PortNum.PRIVATE_APP: {
        this.events.onPrivatePacket.dispatch({
          ...packetMetadata,
          data: dataPacket.payload,
        });
        break;
      }

      case Protobuf.Portnums.PortNum.ATAK_FORWARDER: {
        this.events.onAtakForwarderPacket.dispatch({
          ...packetMetadata,
          data: dataPacket.payload,
        });
        break;
      }

      default:
        throw new Error(`Unhandled case ${dataPacket.portnum}`);
    }
  }
}
