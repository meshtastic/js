import { SubEvent } from "sub-events";

import { broadCastNum, minFwVer } from "./constants.js";
import { Protobuf, Types } from "./index.js";
import { log } from "./utils/logging.js";
import { Queue } from "./utils/queue.js";

/** Base class for connection methods to extend */
export abstract class IMeshDevice {
  /** Abstract property that states the connection type */
  protected abstract connType: string;

  /** Logs to the console and the logging event emitter */
  protected log: (
    scope: Types.EmitterScope,
    emitter: Types.Emitter,
    message: string,
    level: Protobuf.LogRecord_Level,
    packet?: Uint8Array
  ) => void;

  /** Describes the current state of the device */
  protected deviceStatus: Types.DeviceStatusEnum;

  /** Describes the current state of the device */
  protected isConfigured: boolean;

  /** Device's node number */
  private myNodeInfo: Protobuf.MyNodeInfo;

  /** Randomly generated number to ensure confiuration lockstep */
  public configId: number;

  /**
   * Keeps track of all requests sent to the radio that have callbacks TODO:
   * Update description
   */
  public queue: Queue;

  constructor(configId?: number) {
    this.log = (scope, emitter, message, level, packet): void => {
      log(scope, emitter, message, level);
      this.onLogEvent.emit({
        scope,
        emitter,
        message,
        level,
        packet,
        date: new Date()
      });
    };

    this.deviceStatus = Types.DeviceStatusEnum.DEVICE_DISCONNECTED;
    this.isConfigured = false;
    this.myNodeInfo = Protobuf.MyNodeInfo.create();
    this.configId = configId ?? this.generateRandId();
    this.queue = new Queue();

    this.onDeviceStatus.subscribe((status) => {
      this.deviceStatus = status;
      if (status === Types.DeviceStatusEnum.DEVICE_CONFIGURED)
        this.isConfigured = true;
      else if (status === Types.DeviceStatusEnum.DEVICE_CONFIGURING)
        this.isConfigured = false;
    });

    this.onMyNodeInfo.subscribe((myNodeInfo) => {
      this.myNodeInfo = myNodeInfo;
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
   * Fires when a new FromRadio message has been received from the device
   *
   * @event onLogEvent
   */
  public readonly onLogEvent = new SubEvent<Types.LogEventPacket>();

  /**
   * Fires when a new FromRadio message has been received from the device
   *
   * @event onFromRadio
   */
  public readonly onFromRadio = new SubEvent<Protobuf.FromRadio>();

  /**
   * Fires when a new FromRadio message containing a Data packet has been
   * received from the device
   *
   * @event onMeshPacket
   */
  public readonly onMeshPacket = new SubEvent<Protobuf.MeshPacket>();

  /**
   * Fires when a new MyNodeInfo message has been received from the device
   *
   * @event onMyNodeInfo
   */
  public readonly onMyNodeInfo = new SubEvent<Protobuf.MyNodeInfo>();

  /**
   * Fires when a new MeshPacket message containing a NodeInfo packet has been
   * received from device
   *
   * @event onNodeInfoPacket
   */
  public readonly onNodeInfoPacket = new SubEvent<Types.NodeInfoPacket>();

  /**
   * Fires when a new MeshPacket message containing a User packet has been
   * received from device
   *
   * @event onUserPacket
   */
  public readonly onUserPacket = new SubEvent<Types.UserPacket>();

  /**
   * Fires when a new Channel message is recieved
   *
   * @event onChannelPacket
   */
  public readonly onChannelPacket = new SubEvent<Types.ChannelPacket>();

  /**
   * Fires when a new Config message is recieved
   *
   * @event onConfigPacket
   */
  public readonly onConfigPacket = new SubEvent<Types.ConfigPacket>();

  /**
   * Fires when a new ModuleConfig message is recieved
   *
   * @event onModuleConfigPacket
   */
  public readonly onModuleConfigPacket =
    new SubEvent<Types.ModuleConfigPacket>();

  /**
   * Fires when a new MeshPacket message containing a Ping packet has been
   * received from device
   *
   * @event onPingPacket
   */
  public readonly onPingPacket = new SubEvent<Types.PingPacket>();

  /**
   * Fires when a new MeshPacket message containing a IP Tunnel packet has been
   * received from device
   *
   * @event onIpTunnelPacket
   */

  public readonly onIpTunnelPacket = new SubEvent<Types.IpTunnelPacket>();

  /**
   * Fires when a new MeshPacket message containing a Serial packet has been
   * received from device
   *
   * @event onSerialPacket
   */

  public readonly onSerialPacket = new SubEvent<Types.SerialPacket>();
  /**
   * Fires when a new MeshPacket message containing a Store and Forward packet
   * has been received from device
   *
   * @event onStoreForwardPacket
   */
  public readonly onStoreForwardPacket =
    new SubEvent<Types.StoreForwardPacket>();

  /**
   * Fires when a new MeshPacket message containing a Store and Forward packet
   * has been received from device
   *
   * @event onRangeTestPacket
   */
  public readonly onRangeTestPacket = new SubEvent<Types.RangeTestPacket>();

  /**
   * Fires when a new MeshPacket message containing a Telemetry packet has been
   * received from device
   *
   * @event onTelemetryPacket
   */
  public readonly onTelemetryPacket = new SubEvent<Types.TelemetryPacket>();

  /**
   * Fires when a new MeshPacket message containing a Private packet has been
   * received from device
   *
   * @event onPrivatePacket
   */
  public readonly onPrivatePacket = new SubEvent<Types.PrivatePacket>();

  /**
   * Fires when a new MeshPacket message containing a ATAK packet has been
   * received from device
   *
   * @event onAtakPacket
   */
  public readonly onAtakPacket = new SubEvent<Types.AtakPacket>();

  /**
   * Fires when a new MeshPacket message containing a Routing packet has been
   * received from device
   *
   * @event onRoutingPacket
   */
  public readonly onRoutingPacket = new SubEvent<Types.RoutingPacket>();

  /**
   * Fires when a new MeshPacket message containing a Position packet has been
   * received from device
   *
   * @event onPositionPacket
   */
  public readonly onPositionPacket = new SubEvent<Types.PositionPacket>();

  /**
   * Fires when a new MeshPacket message containing a Text packet has been
   * received from device
   *
   * @event onMessagePacket
   */
  public readonly onMessagePacket = new SubEvent<Types.MessagePacket>();

  /**
   * Fires when a new MeshPacket message containing a Remote Hardware packet has
   * been received from device
   *
   * @event onRemoteHardwarePacket
   */
  public readonly onRemoteHardwarePacket =
    new SubEvent<Types.RemoteHardwarePacket>();

  /**
   * Fires when a new MeshPacket message containing a Waypoint packet has been
   * received from device
   *
   * @event onWaypointPacket
   */
  public readonly onWaypointPacket = new SubEvent<Types.WaypointPacket>();

  /**
   * Fires when the devices connection or configuration status changes
   *
   * @event onDeviceStatus
   */
  public readonly onDeviceStatus = new SubEvent<Types.DeviceStatusEnum>();

  /**
   * Fires when a new FromRadio message containing a Text packet has been
   * received from device
   *
   * @event onLogRecord
   */
  public readonly onLogRecord = new SubEvent<Protobuf.LogRecord>();

  /**
   * Fires when the device receives a meshPacket, returns a timestamp
   *
   * @event onMeshHeartbeat
   */
  public readonly onMeshHeartbeat = new SubEvent<Date>();

  /**
   * Fires when the device receives a Metadata packet
   *
   * @event onDeviceMetadataPacket
   */
  public readonly onDeviceMetadataPacket =
    new SubEvent<Types.DeviceMetadataPacket>();

  /**
   * Sends a text over the radio
   *
   * @param {string} text Message to send
   * @param {number} [destinationNum] Node number of the destination node
   * @param {boolean} [wantAck=false] Whether or not acknowledgement is wanted.
   *   Default is `false`
   * @param {Types.channelNumber} [channel=0] Channel number to send to. Default
   *   is `0`. Default is `0`
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   * @returns {Promise<void>}
   */
  public sendText(
    text: string,
    destinationNum?: number,
    wantAck = false,
    channel: Types.ChannelNumber = 0,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.sendText,
      `📤 Sending message to ${
        destinationNum ?? "broadcast"
      } on channel ${channel.toString()}`,
      Protobuf.LogRecord_Level.DEBUG
    );

    const enc = new TextEncoder();

    return this.sendPacket(
      enc.encode(text),
      Protobuf.PortNum.TEXT_MESSAGE_APP,
      destinationNum,
      wantAck,
      channel,
      undefined,
      true,
      callback
    );
  }

  /**
   * Sends a text over the radio
   *
   * @param {Protobuf.Waypoint} waypoint Desired waypoint to send
   * @param {number} destinationNum Node number of the destination node
   * @param {boolean} wantAck Whether or not acknowledgement is wanted
   * @param {Types.ChannelNumber} channel Channel to send on default of 0
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   * @returns {Promise<void>}
   */
  public sendWaypoint(
    waypoint: Protobuf.Waypoint,
    destinationNum?: number,
    wantAck = false,
    channel: Types.ChannelNumber = 0,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.sendWaypoint,
      `📤 Sending waypoint to ${
        destinationNum ?? "broadcast"
      } on channel ${channel.toString()}`,
      Protobuf.LogRecord_Level.DEBUG
    );

    return this.sendPacket(
      Protobuf.Waypoint.toBinary(waypoint),
      Protobuf.PortNum.WAYPOINT_APP,
      destinationNum,
      wantAck,
      channel,
      undefined,
      true,
      callback,
      undefined
    );
  }

  /**
   * Sends packet over the radio
   *
   * @param {Uint8Array} byteData Raw bytes to send
   * @param {Protobuf.PortNum} portNum DataType Enum of protobuf data type
   * @param {number} [destinationNum] Node number of the destination node
   * @param {boolean} [wantAck=false] Whether or not acknowledgement is wanted.
   *   Default is `false`
   * @param {Types.ChannelNumber} [channel=0] Channel to send. Default is `0`
   * @param {boolean} [wantResponse=false] Used for testing, requests recpipient
   *   to respond in kind with the same type of request. Default is `false`
   * @param {boolean} [echoResponse=false] Sends event back to client. Default
   *   is `false`. Default is `false`
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   * @param {number} [emoji=0] Used for message reactions. Default is `0`
   * @param {number} [replyId=0] Used to reply to a message. Default is `0`
   */
  public async sendPacket(
    byteData: Uint8Array,
    portNum: Protobuf.PortNum,
    destinationNum?: number,
    wantAck = false,
    channel: Types.ChannelNumber = 0,
    wantResponse = false,
    echoResponse = false,
    callback?: (id: number) => Promise<void>,
    emoji = 0,
    replyId = 0
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.sendPacket,
      `📤 Sending ${Protobuf.PortNum[portNum] ?? "UNK"} to ${
        destinationNum ?? "broadcast"
      }`,
      Protobuf.LogRecord_Level.TRACE
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
      to: destinationNum ? destinationNum : broadCastNum,
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
      await this.handleMeshPacket(meshPacket);
    }
    await this.sendRaw(meshPacket.id, toRadio, callback);
  }

  /**
   * Sends raw packet over the radio
   *
   * @param {number} id Unique packet ID
   * @param {Uint8Array} toRadio Binary data to send
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async sendRaw(
    id: number,
    toRadio: Uint8Array,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    if (toRadio.length > 512) {
      this.log(
        Types.EmitterScope.iMeshDevice,
        Types.Emitter.sendRaw,
        `Message longer than 512 bytes, it will not be sent!`,
        Protobuf.LogRecord_Level.WARNING
      );
    } else {
      this.queue.push({
        id,
        data: toRadio,
        callback:
          callback ??
          (async () => {
            return Promise.resolve();
          }),
        waitingAck: false
      });

      await this.queue.processQueue(async (data) => {
        await this.writeToRadio(data);
      });
    }
  }

  /**
   * Writes config to device
   *
   * @param {Protobuf.Config} config Config object
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async setConfig(
    config: Protobuf.Config,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.setConfig,
      `Setting config ${callback ? "with" : "without"} callback`,
      Protobuf.LogRecord_Level.DEBUG
    );

    let configType: Protobuf.AdminMessage_ConfigType;

    switch (config.payloadVariant.oneofKind) {
      case "device":
        configType = Protobuf.AdminMessage_ConfigType.DEVICE_CONFIG;
        break;

      case "display":
        configType = Protobuf.AdminMessage_ConfigType.DISPLAY_CONFIG;
        break;

      case "lora":
        configType = Protobuf.AdminMessage_ConfigType.LORA_CONFIG;
        break;

      case "position":
        configType = Protobuf.AdminMessage_ConfigType.POSITION_CONFIG;
        break;

      case "power":
        configType = Protobuf.AdminMessage_ConfigType.POWER_CONFIG;
        break;

      case "network":
        configType = Protobuf.AdminMessage_ConfigType.NETWORK_CONFIG;
        break;

      case "bluetooth":
        configType = Protobuf.AdminMessage_ConfigType.BLUETOOTH_CONFIG;
        break;
    }

    const setRadio = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        oneofKind: "setConfig",
        setConfig: config
      }
    });

    await this.sendPacket(
      setRadio,
      Protobuf.PortNum.ADMIN_APP,
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      async (id: number) => {
        await this.getConfig(configType);
        await callback?.(id);
      }
    );
  }

  /**
   * Writes module config to device
   *
   * @param {Protobuf.ModuleConfig} config Module config object
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async setModuleConfig(
    config: Protobuf.ModuleConfig,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.setModuleConfig,
      `Setting module config ${callback ? "with" : "without"} callback`,
      Protobuf.LogRecord_Level.DEBUG
    );

    let configType: Protobuf.AdminMessage_ModuleConfigType;

    switch (config.payloadVariant.oneofKind) {
      case "mqtt":
        configType = Protobuf.AdminMessage_ModuleConfigType.MQTT_CONFIG;
        break;

      case "serial":
        configType = Protobuf.AdminMessage_ModuleConfigType.SERIAL_CONFIG;
        break;

      case "externalNotification":
        configType = Protobuf.AdminMessage_ModuleConfigType.EXTNOTIF_CONFIG;
        break;

      case "storeForward":
        configType = Protobuf.AdminMessage_ModuleConfigType.STOREFORWARD_CONFIG;
        break;

      case "rangeTest":
        configType = Protobuf.AdminMessage_ModuleConfigType.RANGETEST_CONFIG;
        break;

      case "telemetry":
        configType = Protobuf.AdminMessage_ModuleConfigType.TELEMETRY_CONFIG;
        break;

      case "cannedMessage":
        configType = Protobuf.AdminMessage_ModuleConfigType.CANNEDMSG_CONFIG;
        break;
    }

    const setRadio = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        oneofKind: "setModuleConfig",
        setModuleConfig: config
      }
    });

    await this.sendPacket(
      setRadio,
      Protobuf.PortNum.ADMIN_APP,
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      async (id: number) => {
        await this.getModuleConfig(configType);
        await callback?.(id);
      }
    );
  }

  /**
   * Confirms the currently set config, and prevents changes from reverting
   * after 10 minutes.
   *
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async confirmSetConfig(
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.confirmSetConfig,
      `Confirming config ${callback ? "with" : "without"} callback`,
      Protobuf.LogRecord_Level.DEBUG
    );

    const confirmSetRadio = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        confirmSetRadio: true,
        oneofKind: "confirmSetRadio"
      }
    });

    await this.sendPacket(
      confirmSetRadio,
      Protobuf.PortNum.ADMIN_APP,
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      callback
    );
  }

  /**
   * Sets devices owner data
   *
   * @param {Protobuf.User} owner Owner data to apply to the device
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async setOwner(
    owner: Protobuf.User,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.setOwner,
      `Setting owner ${callback ? "with" : "without"} callback`,
      Protobuf.LogRecord_Level.DEBUG
    );

    const setOwner = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        setOwner: owner,
        oneofKind: "setOwner"
      }
    });

    await this.sendPacket(
      setOwner,
      Protobuf.PortNum.ADMIN_APP,
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      async (id: number) => {
        await this.getOwner();
        await callback?.(id);
      }
    );
  }

  /**
   * Sets devices ChannelSettings
   *
   * @param {Protobuf.Channel} channel Channel data to be set
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async setChannel(
    channel: Protobuf.Channel,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.setChannel,
      `📻 Setting Channel: ${channel.index} ${
        callback ? "with" : "without"
      } callback`,
      Protobuf.LogRecord_Level.DEBUG
    );

    const setChannel = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        setChannel: channel,
        oneofKind: "setChannel"
      }
    });

    await this.sendPacket(
      setChannel,
      Protobuf.PortNum.ADMIN_APP,
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      async (id: number) => {
        await this.getChannel(channel.index);
        await callback?.(id);
      }
    );
  }

  /**
   * Confirms the currently set channels, and prevents changes from reverting
   * after 10 minutes.
   *
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async confirmSetChannel(
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.confirmSetChannel,
      `📻 Confirming Channel config ${callback ? "with" : "without"} callback`,
      Protobuf.LogRecord_Level.DEBUG
    );

    const confirmSetChannel = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        confirmSetRadio: true,
        oneofKind: "confirmSetRadio"
      }
    });

    await this.sendPacket(
      confirmSetChannel,
      Protobuf.PortNum.ADMIN_APP,
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      callback
    );
  }

  /**
   * Clears specific channel with the designated index
   *
   * @param {number} index Channel index to be cleared
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async clearChannel(
    index: number,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.clearChannel,
      `📻 Clearing Channel ${index} ${callback ? "with" : "without"} callback`,
      Protobuf.LogRecord_Level.DEBUG
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

    await this.sendPacket(
      setChannel,
      Protobuf.PortNum.ADMIN_APP,
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      async (id: number) => {
        await this.getChannel(channel.index);
        await callback?.(id);
      }
    );
  }

  /**
   * Gets specified channel information from the radio
   *
   * @param {number} index Channel index to be retrieved
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async getChannel(
    index: number,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.getChannel,
      `📻 Requesting Channel: ${index} ${
        callback ? "with" : "without"
      } callback`,
      Protobuf.LogRecord_Level.DEBUG
    );

    const getChannelRequest = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        getChannelRequest: index + 1,
        oneofKind: "getChannelRequest"
      }
    });

    await this.sendPacket(
      getChannelRequest,
      Protobuf.PortNum.ADMIN_APP,
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      callback
    );
  }

  /**
   * Gets all of the devices channels
   *
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async getAllChannels(callback?: () => Promise<void>): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.getAllChannels,
      `📻 Requesting all Channels ${callback ? "with" : "without"} callback`,
      Protobuf.LogRecord_Level.DEBUG
    );

    // TODO: Use device queue now.
    const queue: (() => Promise<void>)[] = [];
    for (let i = 0; i <= this.myNodeInfo.maxChannels; i++) {
      queue.push(async (): Promise<void> => {
        return await Promise.resolve();
      });
      await this.getChannel(i, queue[i]);
    }
    await Promise.all(queue);
    await callback?.();
  }

  /**
   * Gets devices config
   *
   * @param {Protobuf.AdminMessage_ConfigType} configType Desired config type to
   *   request
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async getConfig(
    configType: Protobuf.AdminMessage_ConfigType,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.getConfig,
      `Requesting config ${callback ? "with" : "without"} callback`,
      Protobuf.LogRecord_Level.DEBUG
    );

    const getRadioRequest = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        oneofKind: "getConfigRequest",
        getConfigRequest: configType
      }
    });

    await this.sendPacket(
      getRadioRequest,
      Protobuf.PortNum.ADMIN_APP,
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      callback
    );
  }

  /**
   * Gets Module config
   *
   * @param {Protobuf.AdminMessage_ModuleConfigType} moduleConfigType Desired
   *   module config type to request
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async getModuleConfig(
    moduleConfigType: Protobuf.AdminMessage_ModuleConfigType,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.getModuleConfig,
      `Requesting module config ${callback ? "with" : "without"} callback`,
      Protobuf.LogRecord_Level.DEBUG
    );

    const getRadioRequest = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        oneofKind: "getModuleConfigRequest",
        getModuleConfigRequest: moduleConfigType
      }
    });

    await this.sendPacket(
      getRadioRequest,
      Protobuf.PortNum.ADMIN_APP,
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      callback
    );
  }

  /**
   * Gets devices Owner
   *
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async getOwner(
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.getOwner,
      `Requesting owner ${callback ? "with" : "without"} callback`,
      Protobuf.LogRecord_Level.DEBUG
    );

    const getOwnerRequest = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        getOwnerRequest: true,
        oneofKind: "getOwnerRequest"
      }
    });

    await this.sendPacket(
      getOwnerRequest,
      Protobuf.PortNum.ADMIN_APP,
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      callback
    );
  }

  /**
   * Gets devices metadata
   *
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async getMetadata(
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.getMetadata,
      `Requesting owner ${callback ? "with" : "without"} callback`,
      Protobuf.LogRecord_Level.DEBUG
    );

    const getDeviceMetricsRequest = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        getDeviceMetadataRequest: 0,
        oneofKind: "getDeviceMetadataRequest"
      }
    });

    await this.sendPacket(
      getDeviceMetricsRequest,
      Protobuf.PortNum.ADMIN_APP,
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      callback
    );
  }

  /**
   * Resets the internal NodeDB of the radio, usefull for removing old nodes
   * that no longer exist.
   *
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async resetPeers(
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.resetPeers,
      `📻 Resetting Peers ${callback ? "with" : "without"} callback`,
      Protobuf.LogRecord_Level.DEBUG
    );

    const resetPeers = Protobuf.AdminMessage.toBinary({
      payloadVariant: {
        nodedbReset: 1,
        oneofKind: "nodedbReset"
      }
    });

    await this.sendPacket(
      resetPeers,
      Protobuf.PortNum.ADMIN_APP,
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      async (id: number) => {
        callback && (await callback(id));
      }
    );
  }

  /** Triggers the device configure process */
  public configure(): void {
    // TODO: this not always logged
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.configure,
      `⚙️ Requesting device configuration`,
      Protobuf.LogRecord_Level.DEBUG
    );
    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONFIGURING);

    const toRadio = Protobuf.ToRadio.toBinary({
      payloadVariant: {
        wantConfigId: this.configId,
        oneofKind: "wantConfigId"
      }
    });

    setTimeout(() => {
      void this.sendRaw(0, toRadio);
    }, 200);
  }

  /**
   * Updates the device status eliminating duplicate status events
   *
   * @param {Types.DeviceStatusEnum} status New device status
   */
  public updateDeviceStatus(status: Types.DeviceStatusEnum): void {
    if (status !== this.deviceStatus) {
      this.onDeviceStatus.emit(status);
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
  protected async handleFromRadio(fromRadio: Uint8Array): Promise<void> {
    const decodedMessage = Protobuf.FromRadio.fromBinary(fromRadio);

    this.onFromRadio.emit(decodedMessage);

    /** @todo Add map here when `all=true` gets fixed. */
    switch (decodedMessage.payloadVariant.oneofKind) {
      case "packet":
        await this.handleMeshPacket(decodedMessage.payloadVariant.packet);
        break;

      case "myInfo":
        if (
          parseFloat(decodedMessage.payloadVariant.myInfo.firmwareVersion) <
          minFwVer
        ) {
          this.log(
            Types.EmitterScope.iMeshDevice,
            Types.Emitter.handleFromRadio,
            `Device firmware outdated. Min supported: ${minFwVer} got : ${decodedMessage.payloadVariant.myInfo.firmwareVersion}`,
            Protobuf.LogRecord_Level.CRITICAL
          );
        }
        this.onMyNodeInfo.emit(decodedMessage.payloadVariant.myInfo);
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleFromRadio,
          "📱 Received Node info for this device",
          Protobuf.LogRecord_Level.TRACE
        );
        break;

      case "nodeInfo":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleFromRadio,
          `📱 Received Node Info packet for node: ${decodedMessage.payloadVariant.nodeInfo.num}`,
          Protobuf.LogRecord_Level.TRACE
        );

        this.onNodeInfoPacket.emit({
          packet: Protobuf.MeshPacket.create({
            id: decodedMessage.id
          }),
          data: decodedMessage.payloadVariant.nodeInfo
        });

        if (decodedMessage.payloadVariant.nodeInfo.position) {
          this.onPositionPacket.emit({
            packet: Protobuf.MeshPacket.create({
              id: decodedMessage.id,
              from: decodedMessage.payloadVariant.nodeInfo.num
            }),
            data: decodedMessage.payloadVariant.nodeInfo.position
          });
        }

        if (decodedMessage.payloadVariant.nodeInfo.user) {
          this.onUserPacket.emit({
            packet: Protobuf.MeshPacket.create({
              id: decodedMessage.id,
              from: decodedMessage.payloadVariant.nodeInfo.num
            }),
            data: decodedMessage.payloadVariant.nodeInfo.user
          });
        }
        break;

      case "config":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleFromRadio,
          `${
            decodedMessage.payloadVariant.config.payloadVariant.oneofKind
              ? "💾"
              : "⚠️"
          } Received Config packet of variant: ${
            decodedMessage.payloadVariant.config.payloadVariant.oneofKind ??
            "UNK"
          }`,
          decodedMessage.payloadVariant.config.payloadVariant.oneofKind
            ? Protobuf.LogRecord_Level.TRACE
            : Protobuf.LogRecord_Level.WARNING
        );

        this.onConfigPacket.emit({
          packet: Protobuf.MeshPacket.create({
            id: decodedMessage.id
          }),
          data: decodedMessage.payloadVariant.config
        });
        break;

      case "logRecord":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleFromRadio,
          "Received onLogRecord",
          Protobuf.LogRecord_Level.TRACE
        );
        this.onLogRecord.emit(decodedMessage.payloadVariant.logRecord);
        break;

      case "configCompleteId":
        if (decodedMessage.payloadVariant.configCompleteId !== this.configId) {
          this.log(
            Types.EmitterScope.iMeshDevice,
            Types.Emitter.handleFromRadio,
            `❌ Invalid config id reveived from device, exptected ${this.configId} but received ${decodedMessage.payloadVariant.configCompleteId}`,
            Protobuf.LogRecord_Level.ERROR
          );
        }

        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleFromRadio,
          `⚙️ Valid config id reveived from device: ${this.configId}`,
          Protobuf.LogRecord_Level.INFO
        );

        await this.getAllChannels(async () => {
          await Promise.resolve();
        });

        await this.sendRaw(
          0,
          Protobuf.ToRadio.toBinary({
            payloadVariant: {
              peerInfo: {
                appVersion: 1,
                mqttGateway: false
              },
              oneofKind: "peerInfo"
            }
          })
        );

        this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONFIGURED);
        break;

      case "rebooted":
        this.configure();
        break;

      case "moduleConfig":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleFromRadio,
          `${
            decodedMessage.payloadVariant.moduleConfig.payloadVariant.oneofKind
              ? "💾"
              : "⚠️"
          } Received Module Config packet of variant: ${
            decodedMessage.payloadVariant.moduleConfig.payloadVariant
              .oneofKind ?? "UNK"
          }`,
          decodedMessage.payloadVariant.moduleConfig.payloadVariant.oneofKind
            ? Protobuf.LogRecord_Level.TRACE
            : Protobuf.LogRecord_Level.WARNING
        );

        this.onModuleConfigPacket.emit({
          packet: Protobuf.MeshPacket.create({
            id: decodedMessage.id
          }),
          data: decodedMessage.payloadVariant.moduleConfig
        });
        break;
    }
  }

  /** Completes all SubEvents */
  public complete(): void {
    this.onLogEvent.cancelAll();
    this.onFromRadio.cancelAll();
    this.onMeshPacket.cancelAll();
    this.onMyNodeInfo.cancelAll();
    this.onNodeInfoPacket.cancelAll();
    this.onUserPacket.cancelAll();
    this.onChannelPacket.cancelAll();
    this.onConfigPacket.cancelAll();
    this.onModuleConfigPacket.cancelAll();
    this.onPingPacket.cancelAll();
    this.onIpTunnelPacket.cancelAll();
    this.onSerialPacket.cancelAll();
    this.onStoreForwardPacket.cancelAll();
    this.onRangeTestPacket.cancelAll();
    this.onTelemetryPacket.cancelAll();
    this.onPrivatePacket.cancelAll();
    this.onAtakPacket.cancelAll();
    this.onRoutingPacket.cancelAll();
    this.onPositionPacket.cancelAll();
    this.onMessagePacket.cancelAll();
    this.onRemoteHardwarePacket.cancelAll();
    this.onDeviceStatus.cancelAll();
    this.onLogRecord.cancelAll();
    this.onMeshHeartbeat.cancelAll();
    this.queue.clear();
  }

  /**
   * Gets called when a MeshPacket is received from device
   *
   * @param {Protobuf.MeshPacket} meshPacket Packet to process
   */
  private async handleMeshPacket(
    meshPacket: Protobuf.MeshPacket
  ): Promise<void> {
    this.onMeshPacket.emit(meshPacket);
    if (meshPacket.from !== this.myNodeInfo.myNodeNum) {
      /**
       * TODO: this shouldn't be called unless the device interracts with the
       * mesh, currently it does.
       */
      this.onMeshHeartbeat.emit(new Date());
    }

    switch (meshPacket.payloadVariant.oneofKind) {
      case "decoded":
        await this.queue.processAck(
          meshPacket.payloadVariant.decoded.requestId
        );
        this.handleDataPacket(meshPacket.payloadVariant.decoded, meshPacket);
        break;

      case "encrypted":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "Device received encrypted data packet, ignoring.",
          Protobuf.LogRecord_Level.DEBUG
        );
        break;
    }
  }

  private handleDataPacket(
    dataPacket: Protobuf.Data,
    meshPacket: Protobuf.MeshPacket
  ) {
    let adminMessage: Protobuf.AdminMessage | undefined = undefined;
    switch (dataPacket.portnum) {
      case Protobuf.PortNum.TEXT_MESSAGE_APP:
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received TEXT_MESSAGE_APP packet",
          Protobuf.LogRecord_Level.TRACE,
          dataPacket.payload
        );
        this.onMessagePacket.emit({
          packet: meshPacket,
          text: new TextDecoder().decode(dataPacket.payload)
        });
        break;

      case Protobuf.PortNum.REMOTE_HARDWARE_APP:
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received REMOTE_HARDWARE_APP packet",
          Protobuf.LogRecord_Level.TRACE,
          dataPacket.payload
        );
        this.onRemoteHardwarePacket.emit({
          packet: meshPacket,
          data: Protobuf.HardwareMessage.fromBinary(dataPacket.payload)
        });
        break;

      case Protobuf.PortNum.POSITION_APP:
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received POSITION_APP packet",
          Protobuf.LogRecord_Level.TRACE,
          dataPacket.payload
        );
        this.onPositionPacket.emit({
          packet: meshPacket,
          data: Protobuf.Position.fromBinary(dataPacket.payload)
        });
        break;

      case Protobuf.PortNum.NODEINFO_APP:
        /**
         * TODO: workaround for NODEINFO_APP plugin sending a User protobuf
         * instead of a NodeInfo protobuf
         */
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received NODEINFO_APP packet",
          Protobuf.LogRecord_Level.TRACE,
          dataPacket.payload
        );
        this.onUserPacket.emit({
          packet: meshPacket,
          data: Protobuf.User.fromBinary(dataPacket.payload)
        });
        break;

      case Protobuf.PortNum.ROUTING_APP:
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received ROUTING_APP packet",
          Protobuf.LogRecord_Level.TRACE,
          dataPacket.payload
        );
        this.onRoutingPacket.emit({
          packet: meshPacket,
          data: Protobuf.Routing.fromBinary(dataPacket.payload)
        });
        break;

      case Protobuf.PortNum.ADMIN_APP:
        adminMessage = Protobuf.AdminMessage.fromBinary(dataPacket.payload);
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          `📦 Received ADMIN_APP packet of variant ${
            //change
            adminMessage.payloadVariant.oneofKind ?? "UNK"
          }`,
          Protobuf.LogRecord_Level.TRACE,
          dataPacket.payload
        );
        switch (adminMessage.payloadVariant.oneofKind) {
          case "getChannelResponse":
            this.onChannelPacket.emit({
              packet: meshPacket,
              data: adminMessage.payloadVariant.getChannelResponse
            });
            break;
          case "getOwnerResponse":
            this.onUserPacket.emit({
              packet: meshPacket,
              data: adminMessage.payloadVariant.getOwnerResponse
            });
            break;
          case "getConfigResponse":
            this.onConfigPacket.emit({
              packet: meshPacket,
              data: adminMessage.payloadVariant.getConfigResponse
            });
            break;
          case "getModuleConfigResponse":
            this.onModuleConfigPacket.emit({
              packet: meshPacket,
              data: adminMessage.payloadVariant.getModuleConfigResponse
            });
            break;
          case "getDeviceMetadataResponse":
            this.onDeviceMetadataPacket.emit({
              packet: meshPacket,
              data: adminMessage.payloadVariant.getDeviceMetadataResponse
            });
            break;
          default:
            this.log(
              Types.EmitterScope.iMeshDevice,
              Types.Emitter.handleMeshPacket,
              `Received unhandled AdminMessage, type ${
                adminMessage.payloadVariant.oneofKind ?? "undefined"
              }`,
              Protobuf.LogRecord_Level.DEBUG,
              dataPacket.payload
            );
        }
        break;

      case Protobuf.PortNum.TEXT_MESSAGE_COMPRESSED_APP:
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received TEXT_MESSAGE_COMPRESSED_APP packet",
          Protobuf.LogRecord_Level.TRACE,
          dataPacket.payload
        );
        break;

      case Protobuf.PortNum.WAYPOINT_APP:
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received WAYPOINT_APP packet",
          Protobuf.LogRecord_Level.TRACE,
          dataPacket.payload
        );
        this.onWaypointPacket.emit({
          packet: meshPacket,
          data: Protobuf.Waypoint.fromBinary(dataPacket.payload)
        });
        break;

      case Protobuf.PortNum.REPLY_APP:
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received REPLY_APP packet",
          Protobuf.LogRecord_Level.TRACE,
          dataPacket.payload
        );
        this.onPingPacket.emit({
          packet: meshPacket,
          data: dataPacket.payload
        });
        break;

      case Protobuf.PortNum.IP_TUNNEL_APP:
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received IP_TUNNEL_APP packet",
          Protobuf.LogRecord_Level.TRACE,
          dataPacket.payload
        );
        this.onIpTunnelPacket.emit({
          packet: meshPacket,
          data: dataPacket.payload
        });
        break;

      case Protobuf.PortNum.SERIAL_APP:
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received SERIAL_APP packet",
          Protobuf.LogRecord_Level.TRACE,
          dataPacket.payload
        );
        this.onSerialPacket.emit({
          packet: meshPacket,
          data: dataPacket.payload
        });
        break;

      case Protobuf.PortNum.STORE_FORWARD_APP:
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received STORE_FORWARD_APP packet",
          Protobuf.LogRecord_Level.TRACE,
          dataPacket.payload
        );
        this.onStoreForwardPacket.emit({
          packet: meshPacket,
          data: dataPacket.payload
        });
        break;

      case Protobuf.PortNum.RANGE_TEST_APP:
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received RANGE_TEST_APP packet",
          Protobuf.LogRecord_Level.TRACE,
          dataPacket.payload
        );
        this.onRangeTestPacket.emit({
          packet: meshPacket,
          data: dataPacket.payload
        });
        break;

      case Protobuf.PortNum.TELEMETRY_APP:
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received TELEMETRY_APP packet",
          Protobuf.LogRecord_Level.TRACE,
          dataPacket.payload
        );
        this.onTelemetryPacket.emit({
          packet: meshPacket,
          data: Protobuf.Telemetry.fromBinary(dataPacket.payload)
        });
        break;

      case Protobuf.PortNum.PRIVATE_APP:
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received PRIVATE_APP packet",
          Protobuf.LogRecord_Level.TRACE,
          dataPacket.payload
        );
        this.onPrivatePacket.emit({
          packet: meshPacket,
          data: dataPacket.payload
        });
        break;

      case Protobuf.PortNum.ATAK_FORWARDER:
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received ATAK_FORWARDER packet",
          Protobuf.LogRecord_Level.TRACE,
          dataPacket.payload
        );
        this.onAtakPacket.emit({
          packet: meshPacket,
          data: dataPacket.payload
        });
        break;

      default:
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          `⚠️ Received unhandled PortNum: ${
            Protobuf.PortNum[dataPacket.portnum] ?? "UNK"
          }`, //warn
          Protobuf.LogRecord_Level.WARNING,
          dataPacket.payload
        );
        break;
    }
  }
}
