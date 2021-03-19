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
   * Current number of consecutive failed requests
   */
  consecutiveFailedRequests: number;

  constructor() {
    this.onDeviceStatusEvent.subscribe((status) => {
      this.deviceStatus = status;
      if (status === Types.DeviceStatusEnum.DEVICE_CONFIGURED)
        this.isConfigured = true;
    });
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
  readonly onDataPacketEvent: Subject<Protobuf.MeshPacket> = new Subject();

  /**
   * Fires when a new MyNodeInfo message has been received from the device
   */
  readonly onMyNodeInfoEvent: Subject<Protobuf.MyNodeInfo> = new Subject();

  /**
   * Fires when a new RadioConfig message has been received from the device
   */
  readonly onRadioConfigEvent: Subject<Protobuf.RadioConfig> = new Subject();

  /**
   * Fires when a new FromRadio message containing a NodeInfo packet has been received from device
   * @event
   */
  readonly onNodeInfoPacketEvent: Subject<Types.NodeInfoPacket> = new Subject();

  /**
   * Fires when a new FromRadio message containing a Routing packet has been received from device
   * @event
   */
  readonly onRoutingPacketEvent: Subject<Types.RoutingInfoPacket> = new Subject();

  /**
   * Fires when a new FromRadio message containing a Position packet has been received from device
   * @event
   */
  readonly onPositionPacketEvent: Subject<Types.PositionPacket> = new Subject();

  /**
   * Fires when a new FromRadio message containing a Text packet has been received from device
   * @event
   */
  readonly onTextPacketEvent: Subject<Types.TextPacket> = new Subject();

  /**
   * Fires when the devices connection or configuration status changes
   * @event
   */
  readonly onDeviceStatusEvent: Subject<Types.DeviceStatusEnum> = new Subject();

  /**
   * Sends a text over the radio
   * @param text
   * @param destinationNum Node number of the destination node
   * @param wantAck Whether or not acknowledgement is wanted
   */
  sendText(text: string, destinationNum?: number, wantAck = false) {
    /**
     * DOMStrings are 16-bit-encoded strings, convert to UInt8Array first
     */
    const enc = new TextEncoder();

    return this.sendData(
      enc.encode(text),
      Protobuf.PortNumEnum.TEXT_MESSAGE_APP,
      destinationNum,
      wantAck
    );
  }

  /**
   * Sends arbitrary data over the radio
   * @param byteData
   * @param dataType dataType Enum of protobuf data type
   * @param destinationNum Node number of the destination node
   * @param wantAck Whether or not acknowledgement is wanted
   * @param wantResponse Used for testing, requests recpipient to respond in kind with the same type of request
   */
  sendData(
    byteData: Uint8Array,
    dataType: Protobuf.PortNumEnum,
    destinationNum?: number,
    wantAck = false,
    wantResponse = false
  ) {
    return this.sendPacket(
      new Protobuf.MeshPacket({
        decoded: new Protobuf.Data({
          payload: byteData,
          portnum: dataType,
          wantResponse
        })
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
    meshPacket: Protobuf.MeshPacket,
    destinationNum?: number,
    wantAck = false
  ) {
    if (!this.isConfigured) {
      log(
        `IMeshDevice.sendPacket`,
        `Device isn't ready, state: ${
          Types.DeviceStatusEnum[this.deviceStatus]
        }`,
        Protobuf.LogLevelEnum.WARNING
      );
    }

    meshPacket.to = destinationNum ? destinationNum : BROADCAST_NUM;
    meshPacket.wantAck = wantAck;
    meshPacket.id = meshPacket.id ?? this.generatePacketId();

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
   * @param configOptions
   */
  async setRadioConfig(configOptions: Protobuf.RadioConfig) {
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
                preferences: configOptions.preferences
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
    if (!this.isConfigured) {
      /**
       * @todo Do we need to read the config to set a new one, if so, can we handle this elsewhere/aren't we already warning them if they havent read the config?
       */
      log(
        `IMeshDevice.setOwner`,
        `Owner config has not been read from device, can't set new one.`,
        Protobuf.LogLevelEnum.WARNING
      );
    }

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
    if (this.deviceStatus < Types.DeviceStatusEnum.DEVICE_CONFIGURED) {
      /**
       * @todo used to check if user had been read from radio, change this
       */
      log(
        `IMeshDevice.setChannelSettings`,
        `ChannelSettings have been read from device, can't set new ones.`,
        Protobuf.LogLevelEnum.WARNING
      );
    }

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
   * @todo implement getRadioRequest, getRadioResponse, getChannelRequest, getChannelResponse
   * @todo update naming to match new terms such as `channel`, `Radio`vs`RadioConfig` etc.
   */

  /**
   * Triggers the device configure process
   */
  async configure() {
    /**
     * @todo, chech if this works correctly
     */
    if (this.deviceStatus < Types.DeviceStatusEnum.DEVICE_CONNECTED) {
      log(
        `IMeshDevice.configure`,
        `Interface is not connected`,
        Protobuf.LogLevelEnum.ERROR
      );
    }

    log(
      `IMeshDevice.configure`,
      "Sending onDeviceStatusEvent: DEVICE_CONFIGURING",
      Protobuf.LogLevelEnum.TRACE
    );
    this.onDeviceStatusEvent.next(Types.DeviceStatusEnum.DEVICE_CONFIGURING);

    log(
      `IMeshDevice.configure`,
      `Requesting radio configuration.`,
      Protobuf.LogLevelEnum.DEBUG
    );
    await this.writeToRadio(
      Protobuf.ToRadio.encode(
        new Protobuf.ToRadio({
          wantConfigId: MY_CONFIG_ID
        })
      ).finish()
    );

    log(
      `IMeshDevice.configure`,
      `Waiting to read radio configuration.`,
      Protobuf.LogLevelEnum.DEBUG
    );
    await this.readFromRadio().then(() => {
      log(
        `IMeshDevice.configure`,
        `Completed reading radio configuration.`,
        Protobuf.LogLevelEnum.DEBUG
      );
    });
  }

  /**
   * Generates random packet identifier
   */
  private generatePacketId() {
    return Math.floor(Math.random() * 1e9);
  }

  /**
   * Gets called whenever a fromRadio message is received from device, returns fromRadio data
   * @param fromRadio Uint8Array containing raw radio data
   */
  protected async handleFromRadio(fromRadio: Uint8Array) {
    let fromRadioObj: Protobuf.FromRadio;

    if (fromRadio.byteLength < 1) {
      log(
        `IMeshDevice.handleFromRadio`,
        `Empty buffer received.`,
        Protobuf.LogLevelEnum.DEBUG
      );
    }

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
    log(
      `IMeshDevice.handleFromRadio`,
      "Sending onFromRadioEvent",
      Protobuf.LogLevelEnum.TRACE
    );
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
          "Sending onMyNodeInfoEvent",
          Protobuf.LogLevelEnum.TRACE
        );

        break;

      case "nodeInfo":
        log(
          `IMeshDevice.handleFromRadio`,
          "Sending onNodeInfoPacketEvent",
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
        break;

      case "configCompleteId":
        if (fromRadioObj.configCompleteId === MY_CONFIG_ID) {
          log(
            `IHTTPConnection.handleFromRadio`,
            "Sending onDeviceStatusEvent: DEVICE_CONFIGURED",
            Protobuf.LogLevelEnum.TRACE
          );
          this.onDeviceStatusEvent.next(
            Types.DeviceStatusEnum.DEVICE_CONFIGURED
          );
        } else {
          log(
            `IMeshDevice.handleFromRadio`,
            `Invalid config id reveived from device`,
            Protobuf.LogLevelEnum.ERROR
          );
        }

        break;

      case "rebooted":
        /**
         * @todo Should we ping the device here, or auto ping in the configure() method?
         */

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
   * Gets called when a data, user or position packet is received from device
   * @param meshPacket
   */
  private handleMeshPacket(meshPacket: Protobuf.MeshPacket) {
    log(
      `IMeshDevice.handleMeshPacket`,
      "Sending onDataPacketEvent",
      Protobuf.LogLevelEnum.TRACE
    );
    this.onDataPacketEvent.next(meshPacket);

    if (meshPacket.decoded.payload) {
      console.log(
        `got portnum ${Protobuf.PortNumEnum[meshPacket.decoded.portnum]}`
      );
      switch (meshPacket.decoded.portnum) {
        case Protobuf.PortNumEnum.TEXT_MESSAGE_APP:
          /**
           * Text messages
           */
          const text = new TextDecoder().decode(meshPacket.decoded.payload);
          log(
            `IMeshDevice.handleMeshPacket`,
            "Sending onTextPacketEvent",
            Protobuf.LogLevelEnum.TRACE
          );
          this.onTextPacketEvent.next({
            packet: meshPacket,
            data: text
          });
          break;
        case Protobuf.PortNumEnum.REMOTE_HARDWARE_APP:
          /**
           * Remote Hardware
           */
          console.log("CATCH - REMOTE_HARDWARE_APP");
        case Protobuf.PortNumEnum.POSITION_APP:
          /**
           * Position
           */
          log(
            `IMeshDevice.handleMeshPacket`,
            "Sending onPositionPacketEvent",
            Protobuf.LogLevelEnum.TRACE
          );
          const position = Protobuf.Position.decode(meshPacket.decoded.payload);
          this.onPositionPacketEvent.next({
            packet: meshPacket,
            data: position
          });
        case Protobuf.PortNumEnum.NODEINFO_APP:
          /**
           * Node Info
           */
          const nodeInfo = Protobuf.NodeInfo.decode(meshPacket.decoded.payload);

          log(
            `IMeshDevice.handleMeshPacket`,
            "Sending onNodeInfoPacketEvent",
            Protobuf.LogLevelEnum.TRACE
          );
          this.onNodeInfoPacketEvent.next({
            packet: meshPacket,
            data: nodeInfo
          });
        case Protobuf.PortNumEnum.ROUTING_APP:
          /**
           * Routing
           */
          const routing = Protobuf.Routing.decode(meshPacket.decoded.payload);

          log(
            `IMeshDevice.handleMeshPacket`,
            "Sending onRoutingPacketEvent",
            Protobuf.LogLevelEnum.TRACE
          );
          this.onRoutingPacketEvent.next({
            packet: meshPacket,
            data: routing
          });
        case Protobuf.PortNumEnum.ADMIN_APP:
          /**
           * Admin
           */
          console.log("CATCH - ADMIN_APP");
        case Protobuf.PortNumEnum.REPLY_APP:
          /**
           * Reply
           */
          console.log("CATCH - REPLY_APP");
        case Protobuf.PortNumEnum.STORE_FORWARD_APP:
          /**
           * Store and forward
           */
          console.log("CATCH - STORE_FORWARD_APP");
        case Protobuf.PortNumEnum.RANGE_TEST_APP:
          /**
           * Range test
           */
          console.log("CATCH - RANGE_TEST_APP");
        default:
          log(
            "IMeshDevice.handleMeshPacket",
            `Unhandled PortNum: ${
              Protobuf.PortNumEnum[meshPacket.decoded.portnum]
            }`,
            Protobuf.LogLevelEnum.WARNING
          );
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
    log(
      `IMeshDevice.onConnected`,
      "Sending onDeviceStatusEvent: DEVICE_CONNECTED",
      Protobuf.LogLevelEnum.TRACE
    );
    this.onDeviceStatusEvent.next(Types.DeviceStatusEnum.DEVICE_CONNECTED);

    await this.configure().catch((e) => {
      log(`IMeshDevice.onConnected`, e.message, Protobuf.LogLevelEnum.ERROR);
    });
  }

  /**
   * Gets called when a link to the device has been disconnected
   */
  protected onDisconnected() {
    log(
      `IMeshDevice.onDisconnected`,
      "Sending onDeviceStatusEvent: DEVICE_DISCONNECTED",
      Protobuf.LogLevelEnum.TRACE
    );
    this.onDeviceStatusEvent.next(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
  }
}
