import { Subject } from "rxjs";

import { Types } from "./";
import { BROADCAST_NUM, MIN_FW_VERSION } from "./constants";
import { AdminMessage } from "./generated/admin";
import type { Channel } from "./generated/channel";
import type { LogRecord, User } from "./generated/mesh";
import {
  FromRadio,
  LogRecord_Level,
  MeshPacket,
  MyNodeInfo,
  NodeInfo,
  Position,
  ToRadio
} from "./generated/mesh";
import { PortNum } from "./generated/portnums";
import type {
  RadioConfig,
  RadioConfig_UserPreferences
} from "./generated/radioconfig";
import type { ConnectionParameters } from "./types";
import { log } from "./utils";

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
   * @todo better desc
   * Randomly generated number to ensure confiuration lockstep
   */
  private configId: number;

  constructor() {
    this.deviceStatus = Types.DeviceStatusEnum.DEVICE_DISCONNECTED;
    this.isConfigured = false;
    this.myNodeInfo = MyNodeInfo.create();
    this.configId = this.generateRandId();

    this.onDeviceStatusEvent.subscribe((status) => {
      this.deviceStatus = status;
      if (status === Types.DeviceStatusEnum.DEVICE_CONFIGURED)
        this.isConfigured = true;
      else if (status === Types.DeviceStatusEnum.DEVICE_CONFIGURING)
        this.isConfigured = false;
    });

    this.onMyNodeInfoEvent.subscribe((myNodeInfo) => {
      this.myNodeInfo = myNodeInfo;
    });
  }

  /**
   * Abstract method that writes data to the radio
   */
  protected abstract writeToRadio(ToRadioUInt8Array: Uint8Array): Promise<void>;

  /**
   * Abstract method that reads data from the radio
   */
  protected abstract readFromRadio(): Promise<void>;

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
  public readonly onFromRadioEvent: Subject<FromRadio> = new Subject();

  /**
   * Fires when a new FromRadio message containing a Data packet has been received from the device
   * @event
   */
  public readonly onMeshPacketEvent: Subject<MeshPacket> = new Subject();

  /**
   * Fires when a new MyNodeInfo message has been received from the device
   */
  public readonly onMyNodeInfoEvent: Subject<MyNodeInfo> = new Subject();

  /**
   * Fires when a new RadioConfig message has been received from the device
   */
  public readonly onRadioConfigEvent: Subject<RadioConfig> = new Subject();

  /**
   * Fires when a new MeshPacket message containing a NodeInfo packet has been received from device
   * @event
   */
  public readonly onNodeInfoPacketEvent: Subject<Types.NodeInfoPacket> = new Subject();

  /**
   * Fires when a new MeshPacket message containing a AndminMessage packet has been received from device
   * @event
   */
  public readonly onAdminPacketEvent: Subject<Types.AdminPacket> = new Subject();

  /**
   * Fires when a new MeshPacket message containing a Routing packet has been received from device
   * @event
   */
  public readonly onRoutingPacketEvent: Subject<MeshPacket> = new Subject();

  /**
   * Fires when a new MeshPacket message containing a Position packet has been received from device
   * @event
   */
  public readonly onPositionPacketEvent: Subject<Types.PositionPacket> = new Subject();

  /**
   * Fires when a new MeshPacket message containing a Text packet has been received from device
   * @event
   */
  public readonly onTextPacketEvent: Subject<Types.TextPacket> = new Subject();

  /**
   * Fires when the devices connection or configuration status changes
   * @event
   */
  public readonly onDeviceStatusEvent: Subject<Types.DeviceStatusEnum> = new Subject();

  /**
   * Fires when a new FromRadio message containing a Text packet has been received from device
   * @event
   */
  public readonly onLogRecordEvent: Subject<LogRecord> = new Subject();

  /**
   * Fires when the device receives a meshPacket, returns a timestamp
   * @event
   */
  public readonly onMeshHeartbeat: Subject<number> = new Subject();

  /**
   * Sends a text over the radio
   * @param text
   * @param destinationNum Node number of the destination node
   * @param wantAck Whether or not acknowledgement is wanted
   */
  public sendText(
    text: string,
    destinationNum?: number,
    wantAck = false
  ): Promise<void> {
    const enc = new TextEncoder();

    return this.sendPacket(
      enc.encode(text),
      PortNum.TEXT_MESSAGE_APP,
      destinationNum,
      wantAck,
      undefined,
      true
    );
  }

  /**
   * Sends packet over the radio
   * @param byteData
   * @param portNum dataType Enum of protobuf data type
   * @param destinationNum Node number of the destination node
   * @param wantAck Whether or not acknowledgement is wanted
   * @param wantResponse Used for testing, requests recpipient to respond in kind with the same type of request
   * @param echoResponse Sends events back to client, without being sent to the device
   */
  public async sendPacket(
    byteData: Uint8Array,
    portNum: PortNum,
    destinationNum?: number,
    wantAck = false,
    wantResponse = false,
    echoResponse = false
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

    if (echoResponse) {
      this.handleMeshPacket(meshPacket);
    }

    await this.writeToRadio(
      ToRadio.toBinary(
        ToRadio.create({
          payloadVariant: {
            packet: meshPacket,
            oneofKind: "packet"
          }
        })
      )
    );
  }

  /**
   * Writes radio config to device
   * @param preferences Radio UserPreferences
   */
  public async setPreferences(
    preferences: RadioConfig_UserPreferences
  ): Promise<void> {
    const setRadio = AdminMessage.toBinary(
      AdminMessage.create({
        variant: {
          setRadio: {
            preferences: preferences
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
      true
    );
  }

  /**
   * Sets devices owner data
   * @param owner
   * @todo what is `confirmSetOwner`?
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
   * @param channel
   * @todo what is `confirmSetChannel`?
   */
  public async setChannelSettings(channel: Channel): Promise<void> {
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
    this.onDeviceStatusEvent.next(Types.DeviceStatusEnum.DEVICE_CONFIGURING);

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

    await this.readFromRadio();

    const radioRequest = AdminMessage.toBinary(
      AdminMessage.create({
        variant: {
          getRadioRequest: true,
          oneofKind: "getRadioRequest"
        }
      })
    );

    this.sendPacket(
      radioRequest,
      PortNum.ADMIN_APP,
      this.myNodeInfo.myNodeNum,
      true,
      true
    );

    for (let index = 1; index <= this.myNodeInfo.maxChannels; index++) {
      const channelRequest = AdminMessage.toBinary(
        AdminMessage.create({
          variant: {
            getChannelRequest: index,
            oneofKind: "getChannelRequest"
          }
        })
      );

      this.sendPacket(
        channelRequest,
        PortNum.ADMIN_APP,
        this.myNodeInfo.myNodeNum,
        true,
        true
      );
    }

    await this.readFromRadio();

    this.onDeviceStatusEvent.next(Types.DeviceStatusEnum.DEVICE_CONFIGURED);
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

    this.onFromRadioEvent.next(decodedMessage);

    if (decodedMessage.payloadVariant.oneofKind === "packet") {
      decodedMessage.payloadVariant.packet;
    }

    /**
     * @todo add map here when `all=true` gets fixed.
     */
    switch (decodedMessage.payloadVariant.oneofKind) {
      case "packet":
        this.handleMeshPacket(decodedMessage.payloadVariant.packet);

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
        this.onMyNodeInfoEvent.next(decodedMessage.payloadVariant.myInfo);
        log(
          `IMeshDevice.handleFromRadio`,
          "Received onMyNodeInfoEvent",
          LogRecord_Level.TRACE
        );

        break;

      case "nodeInfo":
        console.log(
          "_____________NODEINFO_FromRadio______________________________"
        );

        log(
          `IMeshDevice.handleFromRadio`,
          "Received onNodeInfoPacketEvent",
          LogRecord_Level.TRACE
        );
        /**
         * Unifi this, decodedMessage.packet should always be preasent? so you can tell who sent it etc?
         * or maybe not, as meshpacket and mynodeinfo are oneofs
         */
        this.onNodeInfoPacketEvent.next({
          data: decodedMessage.payloadVariant.nodeInfo
        });

        break;

      case "logRecord":
        log(
          `IMeshDevice.handleFromRadio`,
          "Received onLogRecordEvent",
          LogRecord_Level.TRACE
        );
        this.onLogRecordEvent.next(decodedMessage.payloadVariant.logRecord);
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

      default:
        log(
          `MeshInterface.handleFromRadio`,
          `Invalid data received`,
          LogRecord_Level.ERROR
        );
        break;
    }
  }

  /**
   * Gets called when a MeshPacket is received from device
   * @param meshPacket
   */
  private handleMeshPacket(meshPacket: MeshPacket) {
    this.onMeshPacketEvent.next(meshPacket);
    if (meshPacket.from !== this.myNodeInfo.myNodeNum) {
      /**
       * @todo, this shouldn't be called unless the device interracts with the mesh, currently it does.
       */
      this.onMeshHeartbeat.next(Date.now());
    }

    if (meshPacket.payloadVariant.oneofKind === "decoded") {
      switch (meshPacket.payloadVariant.decoded.portnum) {
        case PortNum.TEXT_MESSAGE_APP:
          /**
           * Text messages
           */
          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onTextPacketEvent",
            LogRecord_Level.TRACE
          );
          this.onTextPacketEvent.next({
            packet: meshPacket,
            data: new TextDecoder().decode(
              meshPacket.payloadVariant.decoded.payload
            )
          });
          break;
        case PortNum.POSITION_APP:
          /**
           * Position
           */
          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onPositionPacketEvent",
            LogRecord_Level.TRACE
          );
          this.onPositionPacketEvent.next({
            packet: meshPacket,
            data: Position.fromBinary(meshPacket.payloadVariant.decoded.payload)
          });
          break;
        case PortNum.NODEINFO_APP:
          /**
           * Node Info
           */

          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onNodeInfoPacketEvent",
            LogRecord_Level.TRACE
          );
          this.onNodeInfoPacketEvent.next({
            packet: meshPacket,
            data: NodeInfo.fromBinary(meshPacket.payloadVariant.decoded.payload)
          });
          break;
        case PortNum.ROUTING_APP:
          /**
           * Routing
           */

          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onRoutingPacketEvent",
            LogRecord_Level.TRACE
          );
          this.onRoutingPacketEvent.next(meshPacket);
          break;
        case PortNum.ADMIN_APP:
          /**
           * Admin
           */
          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onAdminPacketEvent",
            LogRecord_Level.TRACE
          );
          this.onAdminPacketEvent.next({
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
