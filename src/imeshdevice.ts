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
  LogLevelEnum,
  NodeInfo,
} from "./protobuf";
import { DeviceStatusEnum, DeviceTransaction } from "./types";
import { log } from "./utils";
import { BROADCAST_NUM, MY_CONFIG_ID } from "./constants";
import { Subject } from "rxjs";

/**
 * Base class for connection methods to extend
 */
export abstract class IMeshDevice {
  /**
   * @todo doccument
   */
  deviceStatus: DeviceStatusEnum;

  /**
   * Timestamp of last time device was interacted with
   */
  lastInteractionTime: number;

  /**
   * Current number of consecutive failed requests
   */
  consecutiveFailedRequests: number;

  constructor() {
    this.onDeviceStatusEvent.subscribe((status) => {
      this.deviceStatus = status;
    });
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
   * Fires when a new FromRadio message has been received from the device
   * @event
   */
  readonly onFromRadioEvent: Subject<FromRadio> = new Subject();

  /**
   * Fires when a new FromRadio message containing a Data packet has been received from the device
   * @event
   */
  readonly onDataPacketEvent: Subject<MeshPacket> = new Subject();

  /**
   * Fires when a new MyNodeInfo message has been received from the device
   */
  readonly onMyNodeInfoEvent: Subject<MyNodeInfo> = new Subject();

  /**
   * Fires when a new RadioConfig message has been received from the device
   */
  readonly onRadioConfigEvent: Subject<RadioConfig> = new Subject();

  /**
   * Fires whenever a transaction is completed with the radio
   * @event
   */
  readonly onDeviceTransactionEvent: Subject<DeviceTransaction> = new Subject();

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
   * Fires when a new FromRadio message containing a Text packet has been received from device
   * @event
   */
  readonly onTextPacketEvent: Subject<{
    packet: MeshPacket;
    data: string;
  }> = new Subject();

  /**
   * Fires when the devices connection or configuration status changes
   * @event
   */
  readonly onDeviceStatusEvent: Subject<DeviceStatusEnum> = new Subject();

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
    if (this.deviceStatus < DeviceStatusEnum.DEVICE_CONFIGURED) {
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
    /**
     * @todo used to check if the radioConfig had bean read, should be verified by whatever clalls this function
     */

    await this.writeToRadio(
      ToRadio.encode(
        new ToRadio({
          setRadio: new RadioConfig({
            preferences: configOptions.preferences,
          }),
        })
      ).finish()
    );
  }

  /**
   * Sets devices owner data
   * @param ownerData
   */
  async setOwner(ownerData: User) {
    if (this.deviceStatus < DeviceStatusEnum.DEVICE_CONFIGURED) {
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
    /**
     * @todo, chech if this works correctly
     */
    if (this.deviceStatus < DeviceStatusEnum.DEVICE_CONNECTED) {
      log(
        `IMeshDevice.configure`,
        `Interface is not connected`,
        LogLevelEnum.ERROR
      );
    }

    log(
      `IMeshDevice.configure`,
      "Sending onDeviceStatusEvent",
      LogLevelEnum.DEBUG,
      "DEVICE_CONFIGURING"
    );
    this.onDeviceStatusEvent.next(DeviceStatusEnum.DEVICE_CONFIGURING);

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
   * Generates packet identifier for new message by increasing previous packet id by one
   * @todo hopefuly replace with cuid
   */
  private generatePacketId() {
    return Math.floor(Math.random() * 1e9);
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
     * Send generic fromRadio Event
     */
    log(
      `IMeshDevice.handleFromRadio`,
      "Sending onFromRadioEvent",
      LogLevelEnum.DEBUG
    );
    this.onFromRadioEvent.next(fromRadioObj);

    switch (fromRadioObj.payloadVariant) {
      case "packet":
        this.handleMeshPacket(fromRadioObj.packet);

        break;

      case "myInfo":
        this.onMyNodeInfoEvent.next(fromRadioObj.myInfo);
        log(
          `IMeshDevice.handleFromRadio`,
          "Sending onMyNodeInfoEvent",
          LogLevelEnum.DEBUG
        );

        break;

      case "nodeInfo":
        log(
          `IMeshDevice.handleFromRadio`,
          "Sending onNodeInfoPacketEvent",
          LogLevelEnum.DEBUG
        );
        /**
         * Unifi this, fromRadioObj.packet should always be preasent? so you can tell who sent it etc?
         * or maybe not, as meshpacket and mynodeinfo are oneofs
         */
        this.onNodeInfoPacketEvent.next({
          packet: fromRadioObj.packet,
          data: fromRadioObj.nodeInfo,
        });

        break;

      case "radio":
        /**
         * Send RadioConfig Event
         */
        log(
          `IMeshDevice.handleFromRadio`,
          "Sending onRadioConfigEvent",
          LogLevelEnum.DEBUG
        );
        this.onRadioConfigEvent.next(fromRadioObj.radio);

        break;

      case "logRecord":
        break;

      case "configCompleteId":
        if (fromRadioObj.configCompleteId === MY_CONFIG_ID) {
          /**
           * @todo check that config is fully sent
           */
          log(
            `IHTTPConnection.handleFromRadio`,
            "Sending onDeviceStatusEvent",
            LogLevelEnum.DEBUG,
            "DEVICE_CONFIGURED"
          );
          this.onDeviceStatusEvent.next(DeviceStatusEnum.DEVICE_CONFIGURED);
          // if (this.currentPacketId) {
          //   /**
          //    * @todo check that config has fully been received
          //    */
          //   log(
          //     `IMeshDevice.handleFromRadio`,
          //     `Device successfully configured`,
          //     LogLevelEnum.DEBUG
          //   );
          // } else {
          //   log(
          //     `IMeshDevice.handleFromRadio`,
          //     `Incomplete config reveived from device`,
          //     LogLevelEnum.WARNING
          //   );
          // }
        } else {
          log(
            `IMeshDevice.handleFromRadio`,
            `Invalid config id reveived from device`,
            LogLevelEnum.WARNING
          );
        }

        break;

      case "rebooted":
        /**
         * @todo check if we should move the device ping here, or move it to a seperate method (abstract?) to allow us to ping ble, http, serial devices whenever...
         */

        await this.configure();

        break;

      case "channel":
        /**
         * @todo create ChannelSettings event
         */

        break;

      default:
        log(
          `MeshInterface.handleFromRadio`,
          `Invalid data received`,
          LogLevelEnum.ERROR
        );
        break;
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
    switch (meshPacket.decoded.data.portnum) {
      case PortNumEnum.TEXT_MESSAGE_APP:
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
        break;
      case PortNumEnum.NODEINFO_APP:
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
      case PortNumEnum.POSITION_APP:
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

      default:
        /**
         * All other portnums
         */
        log(
          `IMeshDevice.handleMeshPacket`,
          "Sending onDataPacketEvent",
          LogLevelEnum.DEBUG
        );
        this.onDataPacketEvent.next(meshPacket);
        break;
    }
  }

  /**
   * Gets called when a link to the device has been established
   * @param noAutoConfig Disables autoconfiguration
   */
  protected async onConnected(noAutoConfig: boolean) {
    log(
      `IMeshDevice.onConnected`,
      "Sending onDeviceStatusEvent",
      LogLevelEnum.DEBUG,
      "DEVICE_CONNECTED"
    );
    this.onDeviceStatusEvent.next(DeviceStatusEnum.DEVICE_CONNECTED);

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
      "Sending onDeviceStatusEvent",
      LogLevelEnum.DEBUG,
      "DEVICE_DISCONNECTED"
    );
    this.onDeviceStatusEvent.next(DeviceStatusEnum.DEVICE_DISCONNECTED);
  }
}
