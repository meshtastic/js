import { Subject } from "rxjs";

import { Protobuf, Types } from "./";
import { BROADCAST_NUM, MIN_FW_VERSION, MY_CONFIG_ID } from "./constants";
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
  protected isConfigured: boolean = false;

  /**
   * Device's node number
   */
  private myNodeInfo: Protobuf.MyNodeInfo;

  private configId: number;

  /**
   * Current number of consecutive failed requests
   */
  protected consecutiveFailedRequests: number;

  constructor() {
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

    this.configId = this.generateRandId();
  }

  /**
   * Abstract method that writes data to the radio
   */
  abstract writeToRadio(ToRadioUInt8Array: Uint8Array): Promise<void>;

  /**
   * Abstract method that reads data from the radio
   */
  abstract readFromRadio(): Promise<void>;

  /**
   * Abstract method that connects to the radio
   */
  abstract connect(..._: any): Promise<void>;

  /**
   * Abstract method that disconnects from the radio
   */
  abstract disconnect(): void;

  /**
   * Abstract method that pings the radio
   */
  abstract ping(): Promise<boolean>;

  /**
   * Fires when a new FromRadio message has been received from the device
   * @event
   */
  readonly onFromRadioEvent: Subject<Protobuf.FromRadio> = new Subject();

  /**
   * Fires when a new FromRadio message containing a Data packet has been received from the device
   * @event
   */
  readonly onMeshPacketEvent: Subject<Protobuf.MeshPacket> = new Subject();

  /**
   * Fires when a new MyNodeInfo message has been received from the device
   */
  readonly onMyNodeInfoEvent: Subject<Protobuf.MyNodeInfo> = new Subject();

  /**
   * Fires when a new RadioConfig message has been received from the device
   */
  readonly onRadioConfigEvent: Subject<Protobuf.RadioConfig> = new Subject();

  /**
   * Fires when a new MeshPacket message containing a NodeInfo packet has been received from device
   * @event
   */
  readonly onNodeInfoPacketEvent: Subject<Types.NodeInfoPacket> = new Subject();

  /**
   * Fires when a new MeshPacket message containing a AndminMessage packet has been received from device
   * @event
   */
  readonly onAdminPacketEvent: Subject<Types.AdminPacket> = new Subject();

  /**
   * Fires when a new MeshPacket message containing a Routing packet has been received from device
   * @event
   */
  readonly onRoutingPacketEvent: Subject<Protobuf.MeshPacket> = new Subject();

  /**
   * Fires when a new MeshPacket message containing a Position packet has been received from device
   * @event
   */
  readonly onPositionPacketEvent: Subject<Types.PositionPacket> = new Subject();

  /**
   * Fires when a new MeshPacket message containing a Text packet has been received from device
   * @event
   */
  readonly onTextPacketEvent: Subject<Types.TextPacket> = new Subject();

  /**
   * Fires when the devices connection or configuration status changes
   * @event
   */
  readonly onDeviceStatusEvent: Subject<Types.DeviceStatusEnum> = new Subject();

  /**
   * Fires when a new FromRadio message containing a Text packet has been received from device
   * @event
   */
  readonly onLogRecordEvent: Subject<Protobuf.LogRecord> = new Subject();

  /**
   * Fires when the device receives a meshPacket, returns a timestamp
   * @event
   */
  readonly onMeshHeartbeat: Subject<number> = new Subject();

  /**
   * Sends a text over the radio
   * @param text
   * @param destinationNum Node number of the destination node
   * @param wantAck Whether or not acknowledgement is wanted
   */
  sendText(text: string, destinationNum?: number, wantAck = false) {
    const enc = new TextEncoder();

    return this.sendPacket(
      enc.encode(text),
      Protobuf.PortNumEnum.TEXT_MESSAGE_APP,
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
   * @param echoResponse Sends events back to client, usefull for messaging, as all packets (mesh and local) can be managed centrally
   */
  private async sendPacket(
    byteData: Uint8Array,
    portNum: Protobuf.PortNumEnum,
    destinationNum?: number,
    wantAck = false,
    wantResponse = false,
    echoResponse = false
  ) {
    const meshPacket = new Protobuf.MeshPacket({
      decoded: new Protobuf.Data({
        payload: byteData,
        portnum: portNum,
        wantResponse
      }),
      from: this.myNodeInfo.myNodeNum,
      to: destinationNum ? destinationNum : BROADCAST_NUM,
      id: this.generateRandId(),
      wantAck: wantAck
    });

    if (echoResponse) {
      this.handleMeshPacket(meshPacket);
    }

    await this.writeToRadio(
      Protobuf.ToRadio.encode(
        new Protobuf.ToRadio({
          packet: meshPacket
        })
      ).finish()
    );
  }

  /**
   * Writes radio config to device
   * @param radioConfig
   */
  async setRadioConfig(radioConfig: Protobuf.RadioConfig) {
    /**
     * @todo used to check if the radioConfig had bean read, should be verified by whatever clalls this function
     * ! @todo fix
     */

    await this.writeToRadio(
      Protobuf.ToRadio.encode(
        new Protobuf.ToRadio({
          packet: new Protobuf.MeshPacket(
            new Protobuf.AdminMessage({
              setRadio: new Protobuf.RadioConfig({
                preferences: radioConfig.preferences
              })
            })
          )
        })
      ).finish()
    );
  }

  /**
   * Sets devices owner data
   * @param ownerData
   */
  async setOwner(ownerData: Protobuf.User) {
    /**
     * @todo, check if packet stucture is correct.
     */

    await this.writeToRadio(
      Protobuf.ToRadio.encode(
        new Protobuf.ToRadio({
          packet: new Protobuf.MeshPacket(
            new Protobuf.AdminMessage({
              setOwner: ownerData
            })
          )
        })
      ).finish()
    );
  }

  /**
   * Sets devices ChannelSettings
   * @param channel
   */
  async setChannelSettings(channel: Protobuf.Channel) {
    /**
     * @todo, check if packet stucture is correct.
     */

    await this.writeToRadio(
      Protobuf.ToRadio.encode(
        new Protobuf.ToRadio({
          packet: new Protobuf.MeshPacket(
            new Protobuf.AdminMessage({
              setChannel: channel
            })
          )
        })
      ).finish()
    );
  }

  /**
   * @todo update naming to match new terms such as `channel`, `Radio`vs`RadioConfig` etc.
   */

  /**
   * Triggers the device configure process
   */
  async configure() {
    this.onDeviceStatusEvent.next(Types.DeviceStatusEnum.DEVICE_CONFIGURING);

    await this.writeToRadio(
      Protobuf.ToRadio.encode(
        new Protobuf.ToRadio({
          wantConfigId: MY_CONFIG_ID
        })
      ).finish()
    );

    await this.readFromRadio();

    const adminMessage = Protobuf.AdminMessage.encode(
      new Protobuf.AdminMessage({
        getRadioRequest: true
      })
    ).finish();
    this.sendPacket(
      adminMessage,
      Protobuf.PortNumEnum.ADMIN_APP,
      this.myNodeInfo.myNodeNum,
      true,
      true
    );

    await this.readFromRadio();

    for (let index = 1; index <= this.myNodeInfo.maxChannels; index++) {
      const channelRequest = Protobuf.AdminMessage.encode(
        new Protobuf.AdminMessage({
          getChannelRequest: index
        })
      ).finish();
      this.sendPacket(
        channelRequest,
        Protobuf.PortNumEnum.ADMIN_APP,
        this.myNodeInfo.myNodeNum,
        true,
        true
      );
      await this.readFromRadio();
    }

    this.onDeviceStatusEvent.next(Types.DeviceStatusEnum.DEVICE_CONFIGURED);
  }

  /**
   * Generates random packet identifier
   */
  private generateRandId() {
    return Math.floor(Math.random() * 1e9);
  }

  /**
   * Gets called whenever a fromRadio message is received from device, returns fromRadio data
   * @param fromRadio Uint8Array containing raw radio data
   */
  protected async handleFromRadio(fromRadio: Uint8Array) {
    let fromRadioObj: Protobuf.FromRadio;

    try {
      fromRadioObj = Protobuf.FromRadio.decode(fromRadio);
    } catch (e) {
      log(
        `IMeshDevice.handleFromRadio`,
        e.message,
        Protobuf.LogLevelEnum.ERROR
      );
    }

    /**
     * Send generic fromRadio Event
     */
    this.onFromRadioEvent.next(fromRadioObj);

    switch (fromRadioObj.payloadVariant) {
      case "packet":
        this.handleMeshPacket(fromRadioObj.packet);

        break;

      case "myInfo":
        if (parseFloat(fromRadioObj.myInfo.firmwareVersion) < MIN_FW_VERSION) {
          log(
            `IMeshDevice.handleFromRadio`,
            `Device firmware outdated. Min supported: ${MIN_FW_VERSION} got : ${fromRadioObj.myInfo.firmwareVersion}`,
            Protobuf.LogLevelEnum.CRITICAL
          );
        }
        this.onMyNodeInfoEvent.next(fromRadioObj.myInfo);
        log(
          `IMeshDevice.handleFromRadio`,
          "Received onMyNodeInfoEvent",
          Protobuf.LogLevelEnum.TRACE
        );

        break;

      case "nodeInfo":
        log(
          `IMeshDevice.handleFromRadio`,
          "Received onNodeInfoPacketEvent",
          Protobuf.LogLevelEnum.TRACE
        );
        /**
         * Unifi this, fromRadioObj.packet should always be preasent? so you can tell who sent it etc?
         * or maybe not, as meshpacket and mynodeinfo are oneofs
         */
        this.onNodeInfoPacketEvent.next({
          packet: fromRadioObj.packet,
          data: fromRadioObj.nodeInfo
        });

        break;

      case "logRecord":
        log(
          `IMeshDevice.handleFromRadio`,
          "Received onLogRecordEvent",
          Protobuf.LogLevelEnum.TRACE
        );
        this.onLogRecordEvent.next(fromRadioObj.logRecord);
        break;

      case "configCompleteId":
        if (fromRadioObj.configCompleteId !== this.configId) {
          log(
            `IMeshDevice.handleFromRadio`,
            `Invalid config id reveived from device`,
            Protobuf.LogLevelEnum.ERROR
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
          Protobuf.LogLevelEnum.ERROR
        );
        break;
    }
  }

  /**
   * Gets called when a MeshPacket is received from device
   * @param meshPacket
   */
  private handleMeshPacket(meshPacket: Protobuf.MeshPacket) {
    this.onMeshPacketEvent.next(meshPacket);
    if (meshPacket.from !== this.myNodeInfo.myNodeNum) {
      /**
       * @todo, this shouldn't be called unless the device interracts with the mesh, currently it does.
       */
      this.onMeshHeartbeat.next(Date.now());
    }

    if (meshPacket.decoded.payload) {
      switch (meshPacket.decoded.portnum) {
        case Protobuf.PortNumEnum.TEXT_MESSAGE_APP:
          /**
           * Text messages
           */
          const text = new TextDecoder().decode(meshPacket.decoded.payload);
          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onTextPacketEvent",
            Protobuf.LogLevelEnum.TRACE
          );
          this.onTextPacketEvent.next({
            packet: meshPacket,
            data: text
          });
          break;
        case Protobuf.PortNumEnum.POSITION_APP:
          /**
           * Position
           */
          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onPositionPacketEvent",
            Protobuf.LogLevelEnum.TRACE
          );
          const position = Protobuf.Position.decode(meshPacket.decoded.payload);
          this.onPositionPacketEvent.next({
            packet: meshPacket,
            data: position
          });
          break;
        case Protobuf.PortNumEnum.NODEINFO_APP:
          /**
           * Node Info
           */
          const nodeInfo = Protobuf.NodeInfo.decode(meshPacket.decoded.payload);

          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onNodeInfoPacketEvent",
            Protobuf.LogLevelEnum.TRACE
          );
          this.onNodeInfoPacketEvent.next({
            packet: meshPacket,
            data: nodeInfo
          });
          break;
        case Protobuf.PortNumEnum.ROUTING_APP:
          /**
           * Routing
           */

          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onRoutingPacketEvent",
            Protobuf.LogLevelEnum.TRACE
          );
          this.onRoutingPacketEvent.next(meshPacket);
          break;
        case Protobuf.PortNumEnum.ADMIN_APP:
          /**
           * Admin
           */
          log(
            `IMeshDevice.handleMeshPacket`,
            "Received onAdminPacketEvent",
            Protobuf.LogLevelEnum.TRACE
          );
          const adminMessage = Protobuf.AdminMessage.decode(
            meshPacket.decoded.payload
          );
          this.onAdminPacketEvent.next({
            packet: meshPacket,
            data: adminMessage
          });
          break;
        default:
          log(
            "IMeshDevice.handleMeshPacket",
            `Unhandled PortNum: ${
              Protobuf.PortNumEnum[meshPacket.decoded.portnum]
            }`,
            Protobuf.LogLevelEnum.WARNING
          );
          break;
      }
    } else {
      log(
        `IMeshDevice.handleMeshPacket`,
        "Device received empty data packet, ignoring.",
        Protobuf.LogLevelEnum.DEBUG
      );
    }
  }

  /**
   * Gets called when a link to the device has been established
   */
  protected async onConnected() {
    this.onDeviceStatusEvent.next(Types.DeviceStatusEnum.DEVICE_CONNECTED);

    await this.configure();
  }

  /**
   * Gets called when a link to the device has been disconnected
   */
  protected onDisconnected() {
    this.onDeviceStatusEvent.next(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
  }
}
