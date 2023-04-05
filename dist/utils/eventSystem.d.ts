import { SubEvent } from "sub-events";
import { Protobuf, Types } from "../index.js";
export declare class EventSystem {
    /**
     * Fires when a new FromRadio message has been received from the device
     *
     * @event onLogEvent
     */
    readonly onLogEvent: SubEvent<Types.LogEventPacket>;
    /**
     * Fires when a new FromRadio message has been received from the device
     *
     * @event onFromRadio
     */
    readonly onFromRadio: SubEvent<Protobuf.FromRadio>;
    /**
     * Fires when a new FromRadio message containing a Data packet has been
     * received from the device
     *
     * @event onMeshPacket
     */
    readonly onMeshPacket: SubEvent<Protobuf.MeshPacket>;
    /**
     * Fires when a new MyNodeInfo message has been received from the device
     *
     * @event onMyNodeInfo
     */
    readonly onMyNodeInfo: SubEvent<Protobuf.MyNodeInfo>;
    /**
     * Fires when a new MeshPacket message containing a NodeInfo packet has been
     * received from device
     *
     * @event onNodeInfoPacket
     */
    readonly onNodeInfoPacket: SubEvent<Protobuf.NodeInfo>;
    /**
     * Fires when a new MeshPacket message containing a User packet has been
     * received from device
     *
     * @event onUserPacket
     */
    readonly onUserPacket: SubEvent<Types.PacketMetadata<Protobuf.User>>;
    /**
     * Fires when a new Channel message is recieved
     *
     * @event onChannelPacket
     */
    readonly onChannelPacket: SubEvent<Protobuf.Channel>;
    /**
     * Fires when a new Config message is recieved
     *
     * @event onConfigPacket
     */
    readonly onConfigPacket: SubEvent<Protobuf.Config>;
    /**
     * Fires when a new ModuleConfig message is recieved
     *
     * @event onModuleConfigPacket
     */
    readonly onModuleConfigPacket: SubEvent<Protobuf.ModuleConfig>;
    /**
     * Fires when a new MeshPacket message containing a Ping packet has been
     * received from device
     *
     * @event onPingPacket
     */
    readonly onPingPacket: SubEvent<Types.PacketMetadata<Uint8Array>>;
    /**
     * Fires when a new MeshPacket message containing a IP Tunnel packet has been
     * received from device
     *
     * @event onIpTunnelPacket
     */
    readonly onIpTunnelPacket: SubEvent<Types.PacketMetadata<Uint8Array>>;
    /**
     * Fires when a new MeshPacket message containing a Serial packet has been
     * received from device
     *
     * @event onSerialPacket
     */
    readonly onSerialPacket: SubEvent<Types.PacketMetadata<Uint8Array>>;
    /**
     * Fires when a new MeshPacket message containing a Store and Forward packet
     * has been received from device
     *
     * @event onStoreForwardPacket
     */
    readonly onStoreForwardPacket: SubEvent<Types.PacketMetadata<Uint8Array>>;
    /**
     * Fires when a new MeshPacket message containing a Store and Forward packet
     * has been received from device
     *
     * @event onRangeTestPacket
     */
    readonly onRangeTestPacket: SubEvent<Types.PacketMetadata<Uint8Array>>;
    /**
     * Fires when a new MeshPacket message containing a Telemetry packet has been
     * received from device
     *
     * @event onTelemetryPacket
     */
    readonly onTelemetryPacket: SubEvent<Types.PacketMetadata<Protobuf.Telemetry>>;
    /**
     * Fires when a new MeshPacket message containing a Private packet has been
     * received from device
     *
     * @event onPrivatePacket
     */
    readonly onPrivatePacket: SubEvent<Types.PacketMetadata<Uint8Array>>;
    /**
     * Fires when a new MeshPacket message containing a ATAK packet has been
     * received from device
     *
     * @event onAtakPacket
     */
    readonly onAtakPacket: SubEvent<Types.PacketMetadata<Uint8Array>>;
    /**
     * Fires when a new MeshPacket message containing a Routing packet has been
     * received from device
     *
     * @event onRoutingPacket
     */
    readonly onRoutingPacket: SubEvent<Types.PacketMetadata<Protobuf.Routing>>;
    /**
     * Fires when a new MeshPacket message containing a Position packet has been
     * received from device
     *
     * @event onPositionPacket
     */
    readonly onPositionPacket: SubEvent<Types.PacketMetadata<Protobuf.Position>>;
    /**
     * Fires when a new MeshPacket message containing a Text packet has been
     * received from device
     *
     * @event onMessagePacket
     */
    readonly onMessagePacket: SubEvent<Types.PacketMetadata<string>>;
    /**
     * Fires when a new MeshPacket message containing a Remote Hardware packet has
     * been received from device
     *
     * @event onRemoteHardwarePacket
     */
    readonly onRemoteHardwarePacket: SubEvent<Types.PacketMetadata<Protobuf.HardwareMessage>>;
    /**
     * Fires when a new MeshPacket message containing a Waypoint packet has been
     * received from device
     *
     * @event onWaypointPacket
     */
    readonly onWaypointPacket: SubEvent<Types.PacketMetadata<Protobuf.Waypoint>>;
    /**
     * Fires when the devices connection or configuration status changes
     *
     * @event onDeviceStatus
     */
    readonly onDeviceStatus: SubEvent<Types.DeviceStatusEnum>;
    /**
     * Fires when a new FromRadio message containing a LogRecord packet has been
     * received from device
     *
     * @event onLogRecord
     */
    readonly onLogRecord: SubEvent<Protobuf.LogRecord>;
    /**
     * Fires when the device receives a meshPacket, returns a timestamp
     *
     * @event onMeshHeartbeat
     */
    readonly onMeshHeartbeat: SubEvent<Date>;
    /**
     * Outputs any debug log data (currently serial connections only)
     *
     * @event onDeviceDebugLog
     */
    readonly onDeviceDebugLog: SubEvent<Uint8Array>;
    /**
     * Fires when the device receives a Metadata packet
     *
     * @event onDeviceMetadataPacket
     */
    readonly onDeviceMetadataPacket: SubEvent<Types.PacketMetadata<Protobuf.DeviceMetadata>>;
    /**
     * Outputs status of pending settings changes
     *
     * @event pendingSettingsChange
     */
    readonly onPendingSettingsChange: SubEvent<boolean>;
}
