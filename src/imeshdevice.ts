import { SubEvent } from "sub-events";

import { Protobuf, Types } from "./";
import { BROADCAST_NUM, MIN_FW_VERSION } from "./constants";
import { AdminMessage } from "./generated/admin";
import type { Channel } from "./generated/channel";
import {
  Routing,
  FromRadio,
  LogRecord_Level,
  MeshPacket,
  MyNodeInfo,
  NodeInfo,
  Position,
  ToRadio
} from "./generated/mesh";
import { PortNum } from "./generated/portnums";
import type { User } from "./generated/mesh";
import { RadioConfig_UserPreferences } from "./generated/radioconfig";
import type { ConnectionParameters } from "./types";
import { log } from "./utils/logging";
import { responseQueue } from "./utils/responseQueue";

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

      for (let i = 1; i <= this.myNodeInfo.maxChannels; i++) {
        await this.getChannel(i);
      }
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
   * Fires when a new NodeInfo message has been reveived that has the same node number as the device
   * @event
   */
  public readonly onUserDataPacket: SubEvent<Protobuf.User> = new SubEvent();

  /**
   * Fires when a new MeshPacket message containing a AndminMessage packet has been received from device
   * @event
   */
  public readonly onAdminPacket: SubEvent<Types.AdminPacket> = new SubEvent();

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
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    const enc = new TextEncoder();

    return this.sendPacket(
      enc.encode(text),
      PortNum.TEXT_MESSAGE_APP,
      destinationNum,
      wantAck,
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
      wantAck: wantAck
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
      true,
      false,
      callback
    );
  }

  /**
   * Sets devices owner data
   * @param owner
   */
  public async setOwner(owner: User): Promise<void> {
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
      true
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
      true,
      false,
      async (id: number) => {
        await this.getChannel(channel.index);
        callback && callback(id);
      }
    );
  }

  /**
   * Gets devices ChannelSettings
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
            getChannelRequest: index,
            oneofKind: "getChannelRequest"
          }
        })
      ),
      PortNum.ADMIN_APP,
      this.myNodeInfo.myNodeNum,
      true,
      true,
      false,
      callback
    );
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
        /**
         * Unifi this, decodedMessage.packet should always be preasent? so you can tell who sent it etc?
         * or maybe not, as meshpacket and mynodeinfo are oneofs
         */
        this.onNodeInfoPacket.emit({
          data: decodedMessage.payloadVariant.nodeInfo
        });

        if (
          decodedMessage.payloadVariant.nodeInfo.user &&
          decodedMessage.payloadVariant.nodeInfo.num ===
            this.myNodeInfo.myNodeNum
        ) {
          this.onUserDataPacket.emit(
            decodedMessage.payloadVariant.nodeInfo.user
          );
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
          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onNodeInfoPacket",
            LogRecord_Level.TRACE
          );
          this.onNodeInfoPacket.emit({
            packet: meshPacket,
            data: NodeInfo.fromBinary(meshPacket.payloadVariant.decoded.payload)
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
          await this.responseQueue.process(
            meshPacket.payloadVariant.decoded.requestId
          );
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
