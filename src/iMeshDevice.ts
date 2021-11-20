import { SubEvent } from "sub-events";

import { Protobuf, Types } from "./index.js";
import { BROADCAST_NUM, MIN_FW_VERSION } from "./constants.js";
import { AdminMessage } from "./generated/admin.js";
import type { Channel } from "./generated/channel.js";
import {
  Routing,
  FromRadio,
  LogRecord_Level,
  MeshPacket,
  MyNodeInfo,
  Position,
  ToRadio,
  User
} from "./generated/mesh.js";
import { PortNum } from "./generated/portnums.js";
import { RadioConfig_UserPreferences } from "./generated/radioconfig.js";
import type { ConnectionParameters } from "./types.js";
import { log } from "./utils/logging.js";
import { responseQueue } from "./utils/responseQueue.js";

/**
 * Base class for connection methods to extend
 */
export abstract class IMeshDevice {
  /**
   * Describes the current state of the device
   */
  protected deviceStatus: Types.DeviceStatusEnum;

  /**
   * Describes the current state of the device
   */
  protected isConfigured: boolean;

  /**
   * Device's node number
   */
  private myNodeInfo: MyNodeInfo;

  /**
   * Randomly generated number to ensure confiuration lockstep
   */
  private configId: number;

  /**
   * Device's preferences
   */
  private userPreferences: RadioConfig_UserPreferences;

  /**
   * @TODO desc
   */
  private responseQueue: responseQueue;

  constructor() {
    this.deviceStatus = Types.DeviceStatusEnum.DEVICE_DISCONNECTED;
    this.isConfigured = false;
    this.myNodeInfo = MyNodeInfo.create();
    this.configId = this.generateRandId();
    this.userPreferences = RadioConfig_UserPreferences.create();
    this.responseQueue = new responseQueue();

    this.onDeviceStatus.subscribe((status) => {
      this.deviceStatus = status;
      if (status === Types.DeviceStatusEnum.DEVICE_CONFIGURED)
        this.isConfigured = true;
      else if (status === Types.DeviceStatusEnum.DEVICE_CONFIGURING)
        this.isConfigured = false;
    });

    this.onMyNodeInfo.subscribe(async (myNodeInfo) => {
      this.myNodeInfo = myNodeInfo;
      await this.getAllChannels();
    });

    this.onAdminPacket.subscribe((adminPacket) => {
      switch (adminPacket.data.variant.oneofKind) {
        case "getRadioResponse":
          if (adminPacket.data.variant.getRadioResponse.preferences) {
            this.userPreferences =
              adminPacket.data.variant.getRadioResponse.preferences;
          }
          break;
      }
    });
  }

  /**
   * Abstract method that writes data to the radio
   */
  protected abstract writeToRadio(data: Uint8Array): Promise<void>;

  /**
   * Abstract method that connects to the radio
   */
  protected abstract connect(parameters: ConnectionParameters): Promise<void>;

  /**
   * Abstract method that disconnects from the radio
   */
  protected abstract disconnect(): void;

  /**
   * Abstract method that pings the radio
   */
  protected abstract ping(): Promise<boolean>;

  /**
   * Fires when a new FromRadio message has been received from the device
   * @event
   */
  public readonly onFromRadio: SubEvent<Protobuf.FromRadio> = new SubEvent();

  /**
   * Fires when a new FromRadio message containing a Data packet has been received from the device
   * @event
   */
  public readonly onMeshPacket: SubEvent<Protobuf.MeshPacket> = new SubEvent();

  /**
   * Fires when a new MyNodeInfo message has been received from the device
   */
  public readonly onMyNodeInfo: SubEvent<Protobuf.MyNodeInfo> = new SubEvent();

  /**
   * Fires when a new RadioConfig message has been received from the device
   */
  public readonly onRadioConfig: SubEvent<Protobuf.RadioConfig> =
    new SubEvent();

  /**
   * Fires when a new MeshPacket message containing a NodeInfo packet has been received from device
   * @event
   */
  public readonly onNodeInfoPacket: SubEvent<Types.NodeInfoPacket> =
    new SubEvent();

  /**
   * Fires when a new MeshPacket message containing a User packet has been received from device
   * @event
   */
  public readonly onUserPacket: SubEvent<Types.UserPacket> = new SubEvent();

  /**
   * Fires when a new MeshPacket message containing an AdminMessage packet has been received from device
   * @event
   */
  public readonly onAdminPacket: SubEvent<Types.AdminPacket> = new SubEvent();

  /**
   * Fires when a new MeshPacket message containing a Ping packet has been received from device
   * @event
   */
  public readonly onPingPacket: SubEvent<Types.PingPacket> = new SubEvent();

  /**
   * Fires when a new MeshPacket message containing a IP Tunnel packet has been received from device
   * @event
   */
  public readonly onIpTunnelPacket: SubEvent<Types.IpTunnelPacket> =
    new SubEvent();

  /**
   * Fires when a new MeshPacket message containing a Serial packet has been received from device
   * @event
   */
  public readonly onSerialPacket: SubEvent<Types.SerialPacket> = new SubEvent();
  /**
   * Fires when a new MeshPacket message containing a Store and Forward packet has been received from device
   * @event
   */
  public readonly onStoreForwardPacket: SubEvent<Types.StoreForwardPacket> =
    new SubEvent();

  /**
   * Fires when a new MeshPacket message containing a Store and Forward packet has been received from device
   * @event
   */
  public readonly onRangeTestPacket: SubEvent<Types.RangeTestPacket> =
    new SubEvent();

  /**
   * Fires when a new MeshPacket message containing a Environmental Meassurement packet has been received from device
   * @event
   */
  public readonly onEnvironmentPacket: SubEvent<Types.EnvironmentPacket> =
    new SubEvent();

  /**
   * Fires when a new MeshPacket message containing a Private packet has been received from device
   * @event
   */
  public readonly onPrivatePacket: SubEvent<Types.PrivatePacket> =
    new SubEvent();

  /**
   * Fires when a new MeshPacket message containing a ATAK packet has been received from device
   * @event
   */
  public readonly onAtakPacket: SubEvent<Types.AtakPacket> = new SubEvent();

  /**
   * Fires when a new MeshPacket message containing a Routing packet has been received from device
   * @event
   */
  public readonly onRoutingPacket: SubEvent<Types.RoutingPacket> =
    new SubEvent();

  /**
   * Fires when a new MeshPacket message containing a Position packet has been received from device
   * @event
   */
  public readonly onPositionPacket: SubEvent<Types.PositionPacket> =
    new SubEvent();

  /**
   * Fires when a new MeshPacket message containing a Text packet has been received from device
   * @event
   */
  public readonly onTextPacket: SubEvent<Types.TextPacket> = new SubEvent();

  /**
   * Fires when a new MeshPacket message containing a Remote Hardware packet has been received from device
   * @event
   */
  public readonly onRemoteHardwarePacket: SubEvent<Types.RemoteHardwarePacket> =
    new SubEvent();

  /**
   * Fires when the devices connection or configuration status changes
   * @event
   */
  public readonly onDeviceStatus: SubEvent<Types.DeviceStatusEnum> =
    new SubEvent();

  /**
   * Fires when a new FromRadio message containing a Text packet has been received from device
   * @event
   */
  public readonly onLogRecord: SubEvent<Protobuf.LogRecord> = new SubEvent();

  /**
   * Fires when the device receives a meshPacket, returns a timestamp
   * @event
   */
  public readonly onMeshHeartbeat: SubEvent<Date> = new SubEvent();

  /**
   * Sends a text over the radio
   * @param text
   * @param destinationNum Node number of the destination node
   * @param wantAck Whether or not acknowledgement is wanted
   * @param callback If wantAck is true, callback is called when the ack is received
   */
  public sendText(
    text: string,
    destinationNum?: number,
    wantAck = false,
    channel = 0,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    const enc = new TextEncoder();

    return this.sendPacket(
      enc.encode(text),
      PortNum.TEXT_MESSAGE_APP,
      destinationNum,
      wantAck,
      channel,
      undefined,
      true,

      callback
    );
  }

  /**
   * Sends packet over the radio
   * @param byteData
   * @param portNum dataType Enum of protobuf data type
   * @param destinationNum Node number of the destination node
   * @param wantAck Whether or not acknowledgement is wanted
   * @param wantResponse Used for testing, requests recpipient to respond in kind with the same type of request
   * @param echoResponse Sends event back to client
   * @param callback If wantAck is true, callback is called when the ack is received
   */
  public async sendPacket(
    byteData: Uint8Array,
    portNum: PortNum,
    destinationNum?: number,
    wantAck = false,
    channel = 0,

    wantResponse = false,
    echoResponse = false,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    const meshPacket = MeshPacket.create({
      payloadVariant: {
        decoded: {
          payload: byteData,
          portnum: portNum,
          wantResponse,
          dest: 0, //change this!
          requestId: 0, //change this!
          source: 0 //change this!
        },
        oneofKind: "decoded"
      },
      from: this.myNodeInfo.myNodeNum,
      to: destinationNum ? destinationNum : BROADCAST_NUM,
      id: this.generateRandId(),
      wantAck: wantAck,
      channel
    });

    const toRadio = ToRadio.toBinary(
      ToRadio.create({
        payloadVariant: {
          packet: meshPacket,
          oneofKind: "packet"
        }
      })
    );

    if (toRadio.length > 512) {
      log(
        `IMeshDevice.sendPacket`,
        `Message longer than 512 characters, it will not be sent!`,
        LogRecord_Level.WARNING
      );
    } else {
      if (echoResponse) {
        await this.handleMeshPacket(meshPacket);
      }

      if (typeof callback === "function") {
        this.responseQueue.push({
          id: meshPacket.id,
          callback
        });
      }

      await this.sendRaw(toRadio);
    }
  }

  /**
   * Sends raw packet over the radio
   * @param toRadio binary data to send
   */
  public async sendRaw(toRadio: Uint8Array): Promise<void> {
    if (toRadio.length > 512) {
      log(
        `IMeshDevice.sendPacket`,
        `Message longer than 512 bytes, it will not be sent!`,
        LogRecord_Level.WARNING
      );
    } else {
      await this.writeToRadio(toRadio);
    }
  }

  /**
   * Writes radio config to device
   * @param preferences Radio UserPreferences
   * @param callback If wantAck is true, callback is called when the ack is received
   */
  public async setPreferences(
    preferences: Partial<RadioConfig_UserPreferences>,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    const setRadio = AdminMessage.toBinary(
      AdminMessage.create({
        variant: {
          setRadio: {
            preferences: { ...this.userPreferences, ...preferences }
          },
          oneofKind: "setRadio"
        }
      })
    );

    await this.sendPacket(
      setRadio,
      PortNum.ADMIN_APP,
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      async (id: number) => {
        await this.getPreferences();
        callback && callback(id);
      }
    );
  }

  /**
   * Confirms the currently set preferences, and prevents changes from reverting after 10 minutes.
   * @param callback If wantAck is true, callback is called when the ack is received
   */
  public async confirmSetPreferences(
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    const confirmSetRadio = AdminMessage.toBinary(
      AdminMessage.create({
        variant: {
          confirmSetRadio: true,
          oneofKind: "confirmSetRadio"
        }
      })
    );

    await this.sendPacket(
      confirmSetRadio,
      PortNum.ADMIN_APP,
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
   * @param owner Owner data to apply to the device
   * @param callback If wantAck is true, callback is called when the ack is received
   */
  public async setOwner(
    owner: User,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    const setOwner = AdminMessage.toBinary(
      AdminMessage.create({
        variant: {
          setOwner: owner,
          oneofKind: "setOwner"
        }
      })
    );

    await this.sendPacket(
      setOwner,
      PortNum.ADMIN_APP,
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      async (id: number) => {
        // @todo call getOwner once implemented
        await Promise.resolve();
        callback && callback(id);
      }
    );
  }

  /**
   * Sets devices ChannelSettings
   * @param channel Channel data to be set
   * @param callback If wantAck is true, callback is called when the ack is received
   */
  public async setChannel(
    channel: Channel,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    const setChannel = AdminMessage.toBinary(
      AdminMessage.create({
        variant: {
          setChannel: channel,
          oneofKind: "setChannel"
        }
      })
    );

    await this.sendPacket(
      setChannel,
      PortNum.ADMIN_APP,
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      async (id: number) => {
        await this.getChannel(channel.index);
        callback && callback(id);
      }
    );
  }

  /**
   * Confirms the currently set channels, and prevents changes from reverting after 10 minutes.
   * @param callback If wantAck is true, callback is called when the ack is received
   */
  public async confirmSetChannel(
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    const confirmSetChannel = AdminMessage.toBinary(
      AdminMessage.create({
        variant: {
          confirmSetRadio: true,
          oneofKind: "confirmSetRadio"
        }
      })
    );

    await this.sendPacket(
      confirmSetChannel,
      PortNum.ADMIN_APP,
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      callback
    );
  }

  /**
   * Deletes specific channel via index
   * @param index Channel index to be deleted
   * @param callback If wantAck is true, callback is called when the ack is received
   */
  public async deleteChannel(
    index: number,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    const channel = Protobuf.Channel.create({
      index,
      role: Protobuf.Channel_Role.DISABLED
    });
    const deleteChannel = AdminMessage.toBinary(
      AdminMessage.create({
        variant: {
          setChannel: channel,
          oneofKind: "setChannel"
        }
      })
    );

    await this.sendPacket(
      deleteChannel,
      PortNum.ADMIN_APP,
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      async (id: number) => {
        await this.getChannel(channel.index);
        callback && callback(id);
      }
    );
  }

  /**
   * Gets specified channel information from the radio
   * @param index Channel index to be retrieved
   * @param callback If wantAck is true, callback is called when the ack is received
   */
  public async getChannel(
    index: number,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    await this.sendPacket(
      AdminMessage.toBinary(
        AdminMessage.create({
          variant: {
            getChannelRequest: index + 1,
            oneofKind: "getChannelRequest"
          }
        })
      ),
      PortNum.ADMIN_APP,
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
   * @param callback If wantAck is true, callback is called when the ack is received
   */
  public async getAllChannels(callback?: () => Promise<void>): Promise<void> {
    const queue: Array<() => Promise<void>> = [];
    for (let i = 0; i <= this.myNodeInfo.maxChannels; i++) {
      queue.push(async (): Promise<void> => {
        return await Promise.resolve();
      });
      await this.getChannel(i, queue[i]);
    }
    await Promise.all(queue);
    callback && callback();
  }

  /**
   * Gets devices RadioConfig
   */
  public async getPreferences(): Promise<void> {
    await this.sendPacket(
      AdminMessage.toBinary(
        AdminMessage.create({
          variant: {
            getRadioRequest: true,
            oneofKind: "getRadioRequest"
          }
        })
      ),
      PortNum.ADMIN_APP,
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true
    );
  }

  /**
   * Triggers the device configure process
   */
  public async configure(): Promise<void> {
    log(
      `IMeshDevice.configure`,
      `Reading device configuration`,
      LogRecord_Level.DEBUG
    );
    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONFIGURING);

    await this.writeToRadio(
      ToRadio.toBinary(
        ToRadio.create({
          payloadVariant: {
            wantConfigId: this.configId,
            oneofKind: "wantConfigId"
          }
        })
      )
    );

    await this.getPreferences();

    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONFIGURED);
  }

  /**
   * Updates the device status eliminating duplicate status events
   * @param status
   */
  public updateDeviceStatus(status: Types.DeviceStatusEnum): void {
    if (status !== this.deviceStatus) {
      this.onDeviceStatus.emit(status);
    }
  }

  /**
   * Generates random packet identifier
   */
  private generateRandId(): number {
    return Math.floor(Math.random() * 1e9);
  }

  /**
   * Gets called whenever a fromRadio message is received from device, returns fromRadio data
   * @param fromRadio Uint8Array containing raw radio data
   */
  protected async handleFromRadio(fromRadio: Uint8Array): Promise<void> {
    const decodedMessage = FromRadio.fromBinary(fromRadio);

    this.onFromRadio.emit(decodedMessage);

    /**
     * @todo add map here when `all=true` gets fixed.
     */
    switch (decodedMessage.payloadVariant.oneofKind) {
      case "packet":
        await this.handleMeshPacket(decodedMessage.payloadVariant.packet);
        break;

      case "myInfo":
        if (
          parseFloat(decodedMessage.payloadVariant.myInfo.firmwareVersion) <
          MIN_FW_VERSION
        ) {
          log(
            `IMeshDevice.handleFromRadio`,
            `Device firmware outdated. Min supported: ${MIN_FW_VERSION} got : ${decodedMessage.payloadVariant.myInfo.firmwareVersion}`,
            LogRecord_Level.CRITICAL
          );
        }
        this.onMyNodeInfo.emit(decodedMessage.payloadVariant.myInfo);
        log(
          `IMeshDevice.handleFromRadio`,
          "Received onMyNodeInfo",
          LogRecord_Level.TRACE
        );
        break;

      case "nodeInfo":
        log(
          `IMeshDevice.handleFromRadio`,
          "Received onNodeInfoPacket",
          LogRecord_Level.TRACE
        );

        this.onNodeInfoPacket.emit({
          packet: MeshPacket.create({
            id: decodedMessage.num
          }),
          data: decodedMessage.payloadVariant.nodeInfo
        });

        if (decodedMessage.payloadVariant.nodeInfo.position) {
          this.onPositionPacket.emit({
            packet: MeshPacket.create({
              id: decodedMessage.num,
              from: decodedMessage.payloadVariant.nodeInfo.num
            }),
            data: decodedMessage.payloadVariant.nodeInfo.position
          });
        }

        if (decodedMessage.payloadVariant.nodeInfo.user) {
          this.onUserPacket.emit({
            packet: MeshPacket.create({
              id: decodedMessage.num,
              from: decodedMessage.payloadVariant.nodeInfo.num
            }),
            data: decodedMessage.payloadVariant.nodeInfo.user
          });
        }
        break;

      case "logRecord":
        log(
          `IMeshDevice.handleFromRadio`,
          "Received onLogRecord",
          LogRecord_Level.TRACE
        );
        this.onLogRecord.emit(decodedMessage.payloadVariant.logRecord);
        break;

      case "configCompleteId":
        if (decodedMessage.payloadVariant.configCompleteId !== this.configId) {
          log(
            `IMeshDevice.handleFromRadio`,
            `Invalid config id reveived from device, exptected ${this.configId} but received ${decodedMessage.payloadVariant.configCompleteId}`,
            LogRecord_Level.ERROR
          );
        }
        break;

      case "rebooted":
        await this.configure();
        break;
    }
  }

  /**
   * Completes all SubEvents
   */
  public complete(): void {
    this.onFromRadio.cancelAll();
    this.onMeshPacket.cancelAll();
    this.onMyNodeInfo.cancelAll();
    this.onRadioConfig.cancelAll();
    this.onNodeInfoPacket.cancelAll();
    this.onAdminPacket.cancelAll();
    this.onRoutingPacket.cancelAll();
    this.onPositionPacket.cancelAll();
    this.onTextPacket.cancelAll();
    this.onDeviceStatus.cancelAll();
    this.onLogRecord.cancelAll();
    this.onMeshHeartbeat.cancelAll();
    this.responseQueue.clear();
  }

  /**
   * Gets called when a MeshPacket is received from device
   * @param meshPacket
   */
  private async handleMeshPacket(meshPacket: MeshPacket): Promise<void> {
    this.onMeshPacket.emit(meshPacket);
    if (meshPacket.from !== this.myNodeInfo.myNodeNum) {
      /**
       * @todo, this shouldn't be called unless the device interracts with the mesh, currently it does.
       */
      this.onMeshHeartbeat.emit(new Date());
    }

    if (meshPacket.payloadVariant.oneofKind === "decoded") {
      await this.responseQueue.process(
        meshPacket.payloadVariant.decoded.requestId
      );
      switch (meshPacket.payloadVariant.decoded.portnum) {
        case PortNum.TEXT_MESSAGE_APP:
          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onTextPacket",
            LogRecord_Level.TRACE
          );
          this.onTextPacket.emit({
            packet: meshPacket,
            data: new TextDecoder().decode(
              meshPacket.payloadVariant.decoded.payload
            )
          });
          break;

        case PortNum.REMOTE_HARDWARE_APP:
          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onRemoteHardwarePacket",
            LogRecord_Level.TRACE
          );
          this.onRemoteHardwarePacket.emit({
            packet: meshPacket,
            data: Protobuf.HardwareMessage.fromBinary(
              meshPacket.payloadVariant.decoded.payload
            )
          });
          break;

        case PortNum.POSITION_APP:
          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onPositionPacket",
            LogRecord_Level.TRACE
          );
          this.onPositionPacket.emit({
            packet: meshPacket,
            data: Position.fromBinary(meshPacket.payloadVariant.decoded.payload)
          });
          break;

        case PortNum.NODEINFO_APP:
          /**
           * @todo, workaround for NODEINFO_APP plugin sending a User protobuf instead of a NodeInfo protobuf
           */
          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onUserPacket",
            LogRecord_Level.TRACE
          );
          this.onUserPacket.emit({
            packet: meshPacket,
            data: User.fromBinary(meshPacket.payloadVariant.decoded.payload)
          });
          break;

        case PortNum.ROUTING_APP:
          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onRoutingPacket",
            LogRecord_Level.TRACE
          );
          this.onRoutingPacket.emit({
            packet: meshPacket,
            data: Routing.fromBinary(meshPacket.payloadVariant.decoded.payload)
          });
          break;

        case PortNum.ADMIN_APP:
          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onAdminPacket",
            LogRecord_Level.TRACE
          );
          this.onAdminPacket.emit({
            packet: meshPacket,
            data: AdminMessage.fromBinary(
              meshPacket.payloadVariant.decoded.payload
            )
          });
          break;

        case PortNum.REPLY_APP:
          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onPingPacket",
            LogRecord_Level.TRACE
          );
          this.onPingPacket.emit({
            packet: meshPacket,
            data: meshPacket.payloadVariant.decoded.payload
          });
          break;

        case PortNum.IP_TUNNEL_APP:
          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onIpTunnelPacket",
            LogRecord_Level.TRACE
          );
          this.onIpTunnelPacket.emit({
            packet: meshPacket,
            data: meshPacket.payloadVariant.decoded.payload
          });
          break;

        case PortNum.SERIAL_APP:
          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onSerialPacket",
            LogRecord_Level.TRACE
          );
          this.onSerialPacket.emit({
            packet: meshPacket,
            data: meshPacket.payloadVariant.decoded.payload
          });
          break;

        case PortNum.STORE_FORWARD_APP:
          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onStoreForwardPacket",
            LogRecord_Level.TRACE
          );
          this.onStoreForwardPacket.emit({
            packet: meshPacket,
            data: meshPacket.payloadVariant.decoded.payload
          });
          break;

        case PortNum.RANGE_TEST_APP:
          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onRangeTestPacket",
            LogRecord_Level.TRACE
          );
          this.onRangeTestPacket.emit({
            packet: meshPacket,
            data: meshPacket.payloadVariant.decoded.payload
          });
          break;

        case PortNum.ENVIRONMENTAL_MEASUREMENT_APP:
          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onEnvironmentPacket",
            LogRecord_Level.TRACE
          );
          this.onEnvironmentPacket.emit({
            packet: meshPacket,
            data: Protobuf.EnvironmentalMeasurement.fromBinary(
              meshPacket.payloadVariant.decoded.payload
            )
          });
          break;

        case PortNum.PRIVATE_APP:
          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onPrivatePacket",
            LogRecord_Level.TRACE
          );
          this.onPrivatePacket.emit({
            packet: meshPacket,
            data: meshPacket.payloadVariant.decoded.payload
          });
          break;

        case PortNum.ATAK_FORWARDER:
          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onAtakPacket",
            LogRecord_Level.TRACE
          );
          this.onAtakPacket.emit({
            packet: meshPacket,
            data: meshPacket.payloadVariant.decoded.payload
          });
          break;

        default:
          log(
            "IMeshDevice.handleMeshPacket",
            `Unhandled PortNum: ${
              PortNum[meshPacket.payloadVariant.decoded.portnum]
            }`,
            LogRecord_Level.WARNING
          );
          break;
      }
    } else {
      log(
        `IMeshDevice.handleMeshPacket`,
        "Device received encrypted or empty data packet, ignoring.",
        LogRecord_Level.DEBUG
      );
    }
  }
}
