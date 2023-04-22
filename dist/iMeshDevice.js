import { Logger } from "tslog";
import { broadcastNum, minFwVer } from "./constants.js";
import { Protobuf, Types } from "./index.js";
import { EventSystem } from "./utils/eventSystem.js";
import { Queue } from "./utils/queue.js";
import { XModem } from "./utils/xmodem.js";
/** Base class for connection methods to extend */
export class IMeshDevice {
    /** Logs to the console and the logging event emitter */
    log;
    /** Describes the current state of the device */
    deviceStatus;
    /** Describes the current state of the device */
    isConfigured;
    /** Are there any settings that have yet to be applied? */
    pendingSettingsChanges;
    /** Device's node number */
    myNodeInfo;
    /** Randomly generated number to ensure confiuration lockstep */
    configId;
    /**
     * Packert queue, to space out transmissions and routing handle errors and
     * acks
     */
    queue;
    events;
    XModem;
    constructor(configId) {
        this.log = new Logger({
            name: "iMeshDevice",
            prettyLogTemplate: "{{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t[{{name}}]\t",
        });
        this.deviceStatus = Types.DeviceStatusEnum.DEVICE_DISCONNECTED;
        this.isConfigured = false;
        this.pendingSettingsChanges = false;
        this.myNodeInfo = new Protobuf.MyNodeInfo();
        this.configId = configId ?? this.generateRandId();
        this.queue = new Queue();
        this.events = new EventSystem();
        this.XModem = new XModem(this.sendRaw.bind(this)); //TODO: try wihtout bind
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
    /**
     * Sends a text over the radio
     */
    async sendText(text, destination, wantAck, channel) {
        this.log.debug(Types.Emitter[Types.Emitter.sendText], `📤 Sending message to ${destination ?? "broadcast"} on channel ${channel?.toString() ?? 0}`);
        const enc = new TextEncoder();
        return this.sendPacket(enc.encode(text), Protobuf.PortNum.TEXT_MESSAGE_APP, destination ?? "broadcast", channel, wantAck, false, true);
    }
    /**
     * Sends a text over the radio
     */
    sendWaypoint(waypointMessage, destination, channel) {
        this.log.debug(Types.Emitter[Types.Emitter.sendWaypoint], `📤 Sending waypoint to ${destination} on channel ${channel?.toString() ?? 0}`);
        waypointMessage.id = this.generateRandId();
        return this.sendPacket(waypointMessage.toBinary(), Protobuf.PortNum.WAYPOINT_APP, destination, channel, true, false);
    }
    /**
     * Sends packet over the radio
     */
    async sendPacket(byteData, portNum, destination, channel = Types.ChannelNumber.PRIMARY, wantAck = true, wantResponse = true, echoResponse = false, replyId, emoji) {
        this.log.trace(Types.Emitter[Types.Emitter.sendPacket], `📤 Sending ${Protobuf.PortNum[portNum]} to ${destination}`);
        const meshPacket = new Protobuf.MeshPacket({
            payloadVariant: {
                case: "decoded",
                value: {
                    payload: byteData,
                    portnum: portNum,
                    wantResponse,
                    emoji,
                    replyId,
                    dest: 0,
                    requestId: 0,
                    source: 0, //change this!
                },
            },
            from: this.myNodeInfo.myNodeNum,
            to: destination === "broadcast"
                ? broadcastNum
                : destination === "self"
                    ? this.myNodeInfo.myNodeNum
                    : destination,
            id: this.generateRandId(),
            wantAck: wantAck,
            channel,
        });
        const toRadioMessage = new Protobuf.ToRadio({
            payloadVariant: {
                case: "packet",
                value: meshPacket,
            },
        });
        if (echoResponse) {
            meshPacket.rxTime = Math.trunc(new Date().getTime() / 1000);
            this.handleMeshPacket(meshPacket);
        }
        return this.sendRaw(toRadioMessage.toBinary(), meshPacket.id);
    }
    /**
     * Sends raw packet over the radio
     */
    async sendRaw(toRadio, id = this.generateRandId()) {
        if (toRadio.length > 512) {
            throw new Error("Message longer than 512 bytes, it will not be sent!");
        }
        else {
            this.queue.push({
                id,
                data: toRadio,
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
    async setConfig(config) {
        this.log.debug(Types.Emitter[Types.Emitter.setConfig], `Setting config, Variant: ${config.payloadVariant.case ?? "Unknown"}`);
        if (!this.pendingSettingsChanges) {
            await this.beginEditSettings();
        }
        const configMessage = new Protobuf.AdminMessage({
            payloadVariant: {
                case: "setConfig",
                value: config,
            },
        });
        return this.sendPacket(configMessage.toBinary(), Protobuf.PortNum.ADMIN_APP, "self");
    }
    /**
     * Writes module config to device
     */
    async setModuleConfig(moduleConfig) {
        this.log.debug(Types.Emitter[Types.Emitter.setModuleConfig], "Setting module config");
        const moduleConfigMessage = new Protobuf.AdminMessage({
            payloadVariant: {
                case: "setModuleConfig",
                value: moduleConfig,
            },
        });
        return this.sendPacket(moduleConfigMessage.toBinary(), Protobuf.PortNum.ADMIN_APP, "self");
    }
    /**
     * Sets devices owner data
     */
    async setOwner(owner) {
        this.log.debug(Types.Emitter[Types.Emitter.setOwner], "Setting owner");
        const setOwnerMessage = new Protobuf.AdminMessage({
            payloadVariant: {
                case: "setOwner",
                value: owner,
            },
        });
        return this.sendPacket(setOwnerMessage.toBinary(), Protobuf.PortNum.ADMIN_APP, "self");
    }
    /**
     * Sets devices ChannelSettings
     */
    async setChannel(channel) {
        this.log.debug(Types.Emitter[Types.Emitter.setChannel], `📻 Setting Channel: ${channel.index}`);
        const setChannelMessage = new Protobuf.AdminMessage({
            payloadVariant: {
                case: "setChannel",
                value: channel,
            },
        });
        return this.sendPacket(setChannelMessage.toBinary(), Protobuf.PortNum.ADMIN_APP, "self");
    }
    async setPosition(positionMessage) {
        return this.sendPacket(positionMessage.toBinary(), Protobuf.PortNum.POSITION_APP, "self");
    }
    /**
     * Gets specified channel information from the radio
     */
    async getChannel(index) {
        this.log.debug(Types.Emitter[Types.Emitter.getChannel], `📻 Requesting Channel: ${index}`);
        const getChannelRequestMessage = new Protobuf.AdminMessage({
            payloadVariant: {
                case: "getChannelRequest",
                value: index + 1,
            },
        });
        return this.sendPacket(getChannelRequestMessage.toBinary(), Protobuf.PortNum.ADMIN_APP, "self");
    }
    /**
     * Gets devices config
     *   request
     */
    async getConfig(configType) {
        this.log.debug(Types.Emitter[Types.Emitter.getConfig], "Requesting config");
        const getRadioRequestMessage = new Protobuf.AdminMessage({
            payloadVariant: {
                case: "getConfigRequest",
                value: configType,
            },
        });
        return this.sendPacket(getRadioRequestMessage.toBinary(), Protobuf.PortNum.ADMIN_APP, "self");
    }
    /**
     * Gets Module config
     */
    async getModuleConfig(moduleConfigType) {
        this.log.debug(Types.Emitter[Types.Emitter.getModuleConfig], "Requesting module config");
        const getRadioRequestMessage = new Protobuf.AdminMessage({
            payloadVariant: {
                case: "getModuleConfigRequest",
                value: moduleConfigType,
            },
        });
        return this.sendPacket(getRadioRequestMessage.toBinary(), Protobuf.PortNum.ADMIN_APP, "self");
    }
    /** Gets devices Owner */
    async getOwner() {
        this.log.debug(Types.Emitter[Types.Emitter.getOwner], "Requesting owner");
        const getOwnerRequestMessage = new Protobuf.AdminMessage({
            payloadVariant: {
                case: "getOwnerRequest",
                value: true,
            },
        });
        return this.sendPacket(getOwnerRequestMessage.toBinary(), Protobuf.PortNum.ADMIN_APP, "self");
    }
    /**
     * Gets devices metadata
     */
    async getMetadata(nodeNum) {
        this.log.debug(Types.Emitter[Types.Emitter.getMetadata], `Requesting metadata from ${nodeNum}`);
        const getDeviceMetricsRequestMessage = new Protobuf.AdminMessage({
            payloadVariant: {
                case: "getDeviceMetadataRequest",
                value: true,
            },
        });
        return this.sendPacket(getDeviceMetricsRequestMessage.toBinary(), Protobuf.PortNum.ADMIN_APP, nodeNum, Types.ChannelNumber.ADMIN);
    }
    /**
     * Clears specific channel with the designated index
     */
    async clearChannel(index) {
        this.log.debug(Types.Emitter[Types.Emitter.clearChannel], `📻 Clearing Channel ${index}`);
        const channel = new Protobuf.Channel({
            index,
            role: Protobuf.Channel_Role.DISABLED,
        });
        const setChannelMessage = new Protobuf.AdminMessage({
            payloadVariant: {
                case: "setChannel",
                value: channel,
            },
        });
        return this.sendPacket(setChannelMessage.toBinary(), Protobuf.PortNum.ADMIN_APP, "self");
    }
    async beginEditSettings() {
        this.events.onPendingSettingsChange.emit(true);
        const beginEditSettings = new Protobuf.AdminMessage({
            payloadVariant: {
                case: "beginEditSettings",
                value: true,
            },
        });
        return this.sendPacket(beginEditSettings.toBinary(), Protobuf.PortNum.ADMIN_APP, "self");
    }
    async commitEditSettings() {
        this.events.onPendingSettingsChange.emit(false);
        const commitEditSettings = new Protobuf.AdminMessage({
            payloadVariant: {
                case: "commitEditSettings",
                value: true,
            },
        });
        return this.sendPacket(commitEditSettings.toBinary(), Protobuf.PortNum.ADMIN_APP, "self");
    }
    /**
     * Resets the internal NodeDB of the radio, usefull for removing old nodes
     * that no longer exist.
     */
    async resetPeers() {
        this.log.debug(Types.Emitter[Types.Emitter.resetPeers], "📻 Resetting Peers");
        const resetPeers = new Protobuf.AdminMessage({
            payloadVariant: {
                case: "nodedbReset",
                value: 1,
            },
        });
        return this.sendPacket(resetPeers.toBinary(), Protobuf.PortNum.ADMIN_APP, "self");
    }
    /** Shuts down the current node after the specified amount of time has elapsed. */
    async shutdown(time) {
        this.log.debug(Types.Emitter[Types.Emitter.shutdown], `🔌 Shutting down ${time > 2 ? "now" : `in ${time} seconds`}`);
        const shutdown = new Protobuf.AdminMessage({
            payloadVariant: {
                case: "shutdownSeconds",
                value: time,
            },
        });
        return this.sendPacket(shutdown.toBinary(), Protobuf.PortNum.ADMIN_APP, "self");
    }
    /** Reboots the current node after the specified amount of time has elapsed. */
    async reboot(time) {
        this.log.debug(Types.Emitter[Types.Emitter.reboot], `🔌 Rebooting node ${time > 0 ? "now" : `in ${time} seconds`}`);
        const reboot = new Protobuf.AdminMessage({
            payloadVariant: {
                case: "rebootSeconds",
                value: time,
            },
        });
        return this.sendPacket(reboot.toBinary(), Protobuf.PortNum.ADMIN_APP, "self");
    }
    /**
     * Reboots the current node into OTA mode after the specified amount of time
     * has elapsed.
     */
    async rebootOTA(time) {
        this.log.debug(Types.Emitter[Types.Emitter.rebootOTA], `🔌 Rebooting into OTA mode ${time > 0 ? "now" : `in ${time} seconds`}`);
        const rebootOTA = new Protobuf.AdminMessage({
            payloadVariant: {
                case: "rebootOtaSeconds",
                value: time,
            },
        });
        return this.sendPacket(rebootOTA.toBinary(), Protobuf.PortNum.ADMIN_APP, "self");
    }
    /** Factory resets the current node */
    async factoryReset() {
        this.log.debug(Types.Emitter[Types.Emitter.factoryReset], "♻️ Factory resetting node");
        const factoryReset = new Protobuf.AdminMessage({
            payloadVariant: {
                case: "factoryReset",
                value: 1,
            },
        });
        return this.sendPacket(factoryReset.toBinary(), Protobuf.PortNum.ADMIN_APP, "self");
    }
    /** Triggers the device configure process */
    configure() {
        this.log.debug(Types.Emitter[Types.Emitter.configure], "⚙️ Requesting device configuration");
        this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONFIGURING);
        const toRadio = new Protobuf.ToRadio({
            payloadVariant: {
                case: "wantConfigId",
                value: this.configId,
            },
        });
        return this.sendRaw(toRadio.toBinary());
    }
    /** Sends a trace route packet to the designated node */
    async traceRoute(destination) {
        const routeDiscovery = new Protobuf.RouteDiscovery({
            route: [],
        });
        return this.sendPacket(routeDiscovery.toBinary(), Protobuf.PortNum.ROUTING_APP, destination);
    }
    /** Requests position from the designated node */
    async requestPosition(destination) {
        return this.sendPacket(new Uint8Array(), Protobuf.PortNum.POSITION_APP, destination);
    }
    /**
     * Updates the device status eliminating duplicate status events
     */
    updateDeviceStatus(status) {
        if (status !== this.deviceStatus) {
            this.events.onDeviceStatus.emit(status);
        }
    }
    /**
     * Generates random packet identifier
     *
     * @returns {number} Random packet ID
     */
    generateRandId() {
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
    handleFromRadio(fromRadio) {
        const decodedMessage = Protobuf.FromRadio.fromBinary(fromRadio);
        this.events.onFromRadio.emit(decodedMessage);
        /** @todo Add map here when `all=true` gets fixed. */
        switch (decodedMessage.payloadVariant.case) {
            case "packet":
                this.handleMeshPacket(decodedMessage.payloadVariant.value);
                break;
            case "myInfo":
                if (parseFloat(decodedMessage.payloadVariant.value.firmwareVersion) <
                    minFwVer) {
                    this.log.fatal(Types.Emitter[Types.Emitter.handleFromRadio], `Device firmware outdated. Min supported: ${minFwVer} got : ${decodedMessage.payloadVariant.value.firmwareVersion}`);
                }
                this.events.onMyNodeInfo.emit(decodedMessage.payloadVariant.value);
                this.log.info(Types.Emitter[Types.Emitter.handleFromRadio], "📱 Received Node info for this device");
                break;
            case "nodeInfo":
                this.log.info(Types.Emitter[Types.Emitter.handleFromRadio], `📱 Received Node Info packet for node: ${decodedMessage.payloadVariant.value.num}`);
                this.events.onNodeInfoPacket.emit(decodedMessage.payloadVariant.value);
                //TODO: HERE
                if (decodedMessage.payloadVariant.value.position) {
                    this.events.onPositionPacket.emit({
                        id: decodedMessage.id,
                        rxTime: new Date(),
                        from: decodedMessage.payloadVariant.value.num,
                        to: decodedMessage.payloadVariant.value.num,
                        type: "direct",
                        channel: Types.ChannelNumber.PRIMARY,
                        data: decodedMessage.payloadVariant.value.position,
                    });
                }
                //TODO: HERE
                if (decodedMessage.payloadVariant.value.user) {
                    this.events.onUserPacket.emit({
                        id: decodedMessage.id,
                        rxTime: new Date(),
                        from: decodedMessage.payloadVariant.value.num,
                        to: decodedMessage.payloadVariant.value.num,
                        type: "direct",
                        channel: Types.ChannelNumber.PRIMARY,
                        data: decodedMessage.payloadVariant.value.user,
                    });
                }
                break;
            case "config":
                if (decodedMessage.payloadVariant.value.payloadVariant.case) {
                    this.log.trace(Types.Emitter[Types.Emitter.handleFromRadio], `💾 Received Config packet of variant: ${decodedMessage.payloadVariant.value.payloadVariant.case}`);
                }
                else {
                    this.log.warn(Types.Emitter[Types.Emitter.handleFromRadio], `⚠️ Received Config packet of variant: ${"UNK"}`);
                }
                this.events.onConfigPacket.emit(decodedMessage.payloadVariant.value);
                break;
            case "logRecord":
                this.log.trace(Types.Emitter[Types.Emitter.handleFromRadio], "Received onLogRecord");
                this.events.onLogRecord.emit(decodedMessage.payloadVariant.value);
                break;
            case "configCompleteId":
                if (decodedMessage.payloadVariant.value !== this.configId) {
                    this.log.error(Types.Emitter[Types.Emitter.handleFromRadio], `❌ Invalid config id reveived from device, exptected ${this.configId} but received ${decodedMessage.payloadVariant.value}`);
                }
                this.log.info(Types.Emitter[Types.Emitter.handleFromRadio], `⚙️ Valid config id reveived from device: ${this.configId}`);
                this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONFIGURED);
                break;
            case "rebooted":
                void this.configure().catch(() => {
                    // TODO: FIX, workaround for `wantConfigId` not getting acks.
                });
                break;
            case "moduleConfig":
                if (decodedMessage.payloadVariant.value.payloadVariant.case) {
                    this.log.trace(Types.Emitter[Types.Emitter.handleFromRadio], `💾 Received Module Config packet of variant: ${decodedMessage.payloadVariant.value.payloadVariant.case}`);
                }
                else {
                    this.log.warn(Types.Emitter[Types.Emitter.handleFromRadio], "⚠️ Received Module Config packet of variant: UNK");
                }
                this.events.onModuleConfigPacket.emit(decodedMessage.payloadVariant.value);
                break;
            case "channel":
                this.log.trace(Types.Emitter[Types.Emitter.handleFromRadio], `🔐 Received Channel: ${decodedMessage.payloadVariant.value.index}`);
                this.events.onChannelPacket.emit(decodedMessage.payloadVariant.value);
                break;
            case "queueStatus":
                break;
            case "xmodemPacket":
                void this.XModem.handlePacket(decodedMessage.payloadVariant.value);
                break;
        }
    }
    /** Completes all SubEvents */
    complete() {
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
        this.events.onWaypointPacket.cancelAll();
        this.events.onDeviceStatus.cancelAll();
        this.events.onLogRecord.cancelAll();
        this.events.onMeshHeartbeat.cancelAll();
        this.events.onDeviceDebugLog.cancelAll();
        this.events.onDeviceMetadataPacket.cancelAll();
        this.events.onPendingSettingsChange.cancelAll();
        this.queue.clear();
    }
    /**
     * Gets called when a MeshPacket is received from device
     */
    handleMeshPacket(meshPacket) {
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
                this.handleDecodedPacket(meshPacket.payloadVariant.value, meshPacket);
                break;
            case "encrypted":
                this.log.debug(Types.Emitter[Types.Emitter.handleMeshPacket], "Device received encrypted data packet, ignoring.");
                break;
        }
    }
    handleDecodedPacket(dataPacket, meshPacket) {
        let adminMessage = undefined;
        let routingPacket = undefined;
        const packetMetadata = {
            id: meshPacket.id,
            rxTime: new Date(meshPacket.rxTime * 1000),
            type: meshPacket.to === broadcastNum ? "broadcast" : "direct",
            from: meshPacket.from,
            to: meshPacket.to,
            channel: meshPacket.channel,
        };
        this.log.trace(Types.Emitter[Types.Emitter.handleMeshPacket], `📦 Received ${Protobuf.PortNum[dataPacket.portnum]} packet`);
        switch (dataPacket.portnum) {
            case Protobuf.PortNum.TEXT_MESSAGE_APP:
                this.events.onMessagePacket.emit({
                    ...packetMetadata,
                    data: new TextDecoder().decode(dataPacket.payload),
                });
                break;
            case Protobuf.PortNum.REMOTE_HARDWARE_APP:
                this.events.onRemoteHardwarePacket.emit({
                    ...packetMetadata,
                    data: Protobuf.HardwareMessage.fromBinary(dataPacket.payload),
                });
                break;
            case Protobuf.PortNum.POSITION_APP:
                this.events.onPositionPacket.emit({
                    ...packetMetadata,
                    data: Protobuf.Position.fromBinary(dataPacket.payload),
                });
                break;
            case Protobuf.PortNum.NODEINFO_APP:
                this.events.onUserPacket.emit({
                    ...packetMetadata,
                    data: Protobuf.User.fromBinary(dataPacket.payload),
                });
                break;
            case Protobuf.PortNum.ROUTING_APP:
                routingPacket = Protobuf.Routing.fromBinary(dataPacket.payload);
                this.events.onRoutingPacket.emit({
                    ...packetMetadata,
                    data: routingPacket,
                });
                switch (routingPacket.variant.case) {
                    case "errorReason":
                        if (routingPacket.variant.value === Protobuf.Routing_Error.NONE) {
                            this.queue.processAck(dataPacket.requestId);
                        }
                        else {
                            this.queue.processError({
                                id: dataPacket.requestId,
                                error: routingPacket.variant.value,
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
                            data: adminMessage.payloadVariant.value,
                        });
                        break;
                    case "getConfigResponse":
                        this.events.onConfigPacket.emit(adminMessage.payloadVariant.value);
                        break;
                    case "getModuleConfigResponse":
                        this.events.onModuleConfigPacket.emit(adminMessage.payloadVariant.value);
                        break;
                    case "getDeviceMetadataResponse":
                        this.events.onDeviceMetadataPacket.emit({
                            ...packetMetadata,
                            data: adminMessage.payloadVariant.value,
                        });
                        break;
                    default:
                        this.log.warn(Types.Emitter[Types.Emitter.handleMeshPacket], `⚠️ Received unhandled AdminMessage, type ${adminMessage.payloadVariant.case ?? "undefined"}`, dataPacket.payload);
                }
                break;
            case Protobuf.PortNum.TEXT_MESSAGE_COMPRESSED_APP:
                break;
            case Protobuf.PortNum.WAYPOINT_APP:
                this.events.onWaypointPacket.emit({
                    ...packetMetadata,
                    data: Protobuf.Waypoint.fromBinary(dataPacket.payload),
                });
                break;
            case Protobuf.PortNum.REPLY_APP:
                this.events.onPingPacket.emit({
                    ...packetMetadata,
                    data: dataPacket.payload, //TODO: decode
                });
                break;
            case Protobuf.PortNum.IP_TUNNEL_APP:
                this.events.onIpTunnelPacket.emit({
                    ...packetMetadata,
                    data: dataPacket.payload,
                });
                break;
            case Protobuf.PortNum.SERIAL_APP:
                this.events.onSerialPacket.emit({
                    ...packetMetadata,
                    data: dataPacket.payload,
                });
                break;
            case Protobuf.PortNum.STORE_FORWARD_APP:
                this.events.onStoreForwardPacket.emit({
                    ...packetMetadata,
                    data: dataPacket.payload,
                });
                break;
            case Protobuf.PortNum.RANGE_TEST_APP:
                this.events.onRangeTestPacket.emit({
                    ...packetMetadata,
                    data: dataPacket.payload,
                });
                break;
            case Protobuf.PortNum.TELEMETRY_APP:
                this.events.onTelemetryPacket.emit({
                    ...packetMetadata,
                    data: Protobuf.Telemetry.fromBinary(dataPacket.payload),
                });
                break;
            case Protobuf.PortNum.PRIVATE_APP:
                this.events.onPrivatePacket.emit({
                    ...packetMetadata,
                    data: dataPacket.payload,
                });
                break;
            case Protobuf.PortNum.ATAK_FORWARDER:
                this.events.onAtakPacket.emit({
                    ...packetMetadata,
                    data: dataPacket.payload,
                });
                break;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaU1lc2hEZXZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaU1lc2hEZXZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLE9BQU8sQ0FBQztBQUUvQixPQUFPLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQzdDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNyRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDekMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRTNDLGtEQUFrRDtBQUNsRCxNQUFNLE9BQWdCLFdBQVc7SUFJL0Isd0RBQXdEO0lBQzlDLEdBQUcsQ0FBa0I7SUFFL0IsZ0RBQWdEO0lBQ3RDLFlBQVksQ0FBeUI7SUFFL0MsZ0RBQWdEO0lBQ3RDLFlBQVksQ0FBVTtJQUVoQywwREFBMEQ7SUFDaEQsc0JBQXNCLENBQVU7SUFFMUMsMkJBQTJCO0lBQ25CLFVBQVUsQ0FBc0I7SUFFeEMsZ0VBQWdFO0lBQ3pELFFBQVEsQ0FBUztJQUV4Qjs7O09BR0c7SUFDSSxLQUFLLENBQVE7SUFFYixNQUFNLENBQWM7SUFFcEIsTUFBTSxDQUFTO0lBRXRCLFlBQVksUUFBaUI7UUFDM0IsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLE1BQU0sQ0FBQztZQUNwQixJQUFJLEVBQUUsYUFBYTtZQUNuQixpQkFBaUIsRUFDZiw2REFBNkQ7U0FDaEUsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsbUJBQW1CLENBQUM7UUFDL0QsSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUM7UUFDMUIsSUFBSSxDQUFDLHNCQUFzQixHQUFH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