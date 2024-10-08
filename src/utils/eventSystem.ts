import { SimpleEventDispatcher } from "ste-simple-events";
import type * as Protobuf from "@meshtastic/protobufs";
import type { PacketMetadata } from "../types.ts";
import type * as Types from "../types.ts";

export class EventSystem {
  /**
   * Fires when a new FromRadio message has been received from the device
   *
   * @event onLogEvent
   */
  public readonly onLogEvent =
    new SimpleEventDispatcher<Types.LogEventPacket>();

  /**
   * Fires when a new FromRadio message has been received from the device
   *
   * @event onFromRadio
   */
  public readonly onFromRadio =
    new SimpleEventDispatcher<Protobuf.Mesh.FromRadio>();

  /**
   * Fires when a new FromRadio message containing a Data packet has been
   * received from the device
   *
   * @event onMeshPacket
   */
  public readonly onMeshPacket =
    new SimpleEventDispatcher<Protobuf.Mesh.MeshPacket>();

  /**
   * Fires when a new MyNodeInfo message has been received from the device
   *
   * @event onMyNodeInfo
   */
  public readonly onMyNodeInfo =
    new SimpleEventDispatcher<Protobuf.Mesh.MyNodeInfo>();

  /**
   * Fires when a new MeshPacket message containing a NodeInfo packet has been
   * received from device
   *
   * @event onNodeInfoPacket
   */
  public readonly onNodeInfoPacket =
    new SimpleEventDispatcher<Protobuf.Mesh.NodeInfo>();

  /**
   * Fires when a new Channel message is received
   *
   * @event onChannelPacket
   */
  public readonly onChannelPacket =
    new SimpleEventDispatcher<Protobuf.Channel.Channel>();

  /**
   * Fires when a new Config message is received
   *
   * @event onConfigPacket
   */
  public readonly onConfigPacket =
    new SimpleEventDispatcher<Protobuf.Config.Config>();

  /**
   * Fires when a new ModuleConfig message is received
   *
   * @event onModuleConfigPacket
   */
  public readonly onModuleConfigPacket =
    new SimpleEventDispatcher<Protobuf.ModuleConfig.ModuleConfig>();

  /**
   * Fires when a new MeshPacket message containing a ATAK packet has been
   * received from device
   *
   * @event onAtakPacket
   */
  public readonly onAtakPacket = new SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  >();

  /**
   * Fires when a new MeshPacket message containing a Text packet has been
   * received from device
   *
   * @event onMessagePacket
   */
  public readonly onMessagePacket = new SimpleEventDispatcher<
    PacketMetadata<string>
  >();

  /**
   * Fires when a new MeshPacket message containing a Remote Hardware packet has
   * been received from device
   *
   * @event onRemoteHardwarePacket
   */
  public readonly onRemoteHardwarePacket = new SimpleEventDispatcher<
    PacketMetadata<Protobuf.RemoteHardware.HardwareMessage>
  >();

  /**
   * Fires when a new MeshPacket message containing a Position packet has been
   * received from device
   *
   * @event onPositionPacket
   */
  public readonly onPositionPacket = new SimpleEventDispatcher<
    PacketMetadata<Protobuf.Mesh.Position>
  >();

  /**
   * Fires when a new MeshPacket message containing a User packet has been
   * received from device
   *
   * @event onUserPacket
   */
  public readonly onUserPacket = new SimpleEventDispatcher<
    PacketMetadata<Protobuf.Mesh.User>
  >();

  /**
   * Fires when a new MeshPacket message containing a Routing packet has been
   * received from device
   *
   * @event onRoutingPacket
   */
  public readonly onRoutingPacket = new SimpleEventDispatcher<
    PacketMetadata<Protobuf.Mesh.Routing>
  >();

  /**
   * Fires when the device receives a Metadata packet
   *
   * @event onDeviceMetadataPacket
   */
  public readonly onDeviceMetadataPacket = new SimpleEventDispatcher<
    PacketMetadata<Protobuf.Mesh.DeviceMetadata>
  >();

  /**
   * Fires when a new MeshPacket message containing a Waypoint packet has been
   * received from device
   *
   * @event onWaypointPacket
   */
  public readonly onWaypointPacket = new SimpleEventDispatcher<
    PacketMetadata<Protobuf.Mesh.Waypoint>
  >();

  /**
   * Fires when a new MeshPacket message containing an Audio packet has been
   * received from device
   *
   * @event onAudioPacket
   */
  public readonly onAudioPacket = new SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  >();

  /**
   * Fires when a new MeshPacket message containing a Detection Sensor packet has been
   * received from device
   *
   * @event onDetectionSensorPacket
   */
  public readonly onDetectionSensorPacket = new SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  >();

  /**
   * Fires when a new MeshPacket message containing a Ping packet has been
   * received from device
   *
   * @event onPingPacket
   */
  public readonly onPingPacket = new SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  >();

  /**
   * Fires when a new MeshPacket message containing a IP Tunnel packet has been
   * received from device
   *
   * @event onIpTunnelPacket
   */
  public readonly onIpTunnelPacket = new SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  >();

  /**
   * Fires when a new MeshPacket message containing a Paxcounter packet has been
   * received from device
   *
   * @event onPaxcounterPacket
   */
  public readonly onPaxcounterPacket = new SimpleEventDispatcher<
    PacketMetadata<Protobuf.PaxCount.Paxcount>
  >();

  /**
   * Fires when a new MeshPacket message containing a Serial packet has been
   * received from device
   *
   * @event onSerialPacket
   */
  public readonly onSerialPacket = new SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  >();

  /**
   * Fires when a new MeshPacket message containing a Store and Forward packet
   * has been received from device
   *
   * @event onStoreForwardPacket
   */
  public readonly onStoreForwardPacket = new SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  >();

  /**
   * Fires when a new MeshPacket message containing a Store and Forward packet
   * has been received from device
   *
   * @event onRangeTestPacket
   */
  public readonly onRangeTestPacket = new SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  >();

  /**
   * Fires when a new MeshPacket message containing a Telemetry packet has been
   * received from device
   *
   * @event onTelemetryPacket
   */
  public readonly onTelemetryPacket = new SimpleEventDispatcher<
    PacketMetadata<Protobuf.Telemetry.Telemetry>
  >();

  /**
   * Fires when a new MeshPacket message containing a ZPS packet has been
   * received from device
   *
   * @event onZPSPacket
   */
  public readonly onZpsPacket = new SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  >();

  /**
   * Fires when a new MeshPacket message containing a Simulator packet has been
   * received from device
   *
   * @event onSimulatorPacket
   */
  public readonly onSimulatorPacket = new SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  >();

  /**
   * Fires when a new MeshPacket message containing a Trace Route packet has been
   * received from device
   *
   * @event onTraceRoutePacket
   */
  public readonly onTraceRoutePacket = new SimpleEventDispatcher<
    PacketMetadata<Protobuf.Mesh.RouteDiscovery>
  >();

  /**
   * Fires when a new MeshPacket message containing a Neighbor Info packet has been
   * received from device
   *
   * @event onNeighborInfoPacket
   */
  public readonly onNeighborInfoPacket = new SimpleEventDispatcher<
    PacketMetadata<Protobuf.Mesh.NeighborInfo>
  >();

  /**
   * Fires when a new MeshPacket message containing an ATAK packet has been
   * received from device
   *
   * @event onAtakPluginPacket
   */
  public readonly onAtakPluginPacket = new SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  >();

  /**
   * Fires when a new MeshPacket message containing a Map Report packet has been
   * received from device
   *
   * @event onMapReportPacket
   */
  public readonly onMapReportPacket = new SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  >();

  /**
   * Fires when a new MeshPacket message containing a Private packet has been
   * received from device
   *
   * @event onPrivatePacket
   */
  public readonly onPrivatePacket = new SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  >();

  /**
   * Fires when a new MeshPacket message containing an ATAK Forwarder packet has been
   * received from device
   *
   * @event onAtakForwarderPacket
   */
  public readonly onAtakForwarderPacket = new SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  >();

  /**
   * Fires when the devices connection or configuration status changes
   *
   * @event onDeviceStatus
   */
  public readonly onDeviceStatus =
    new SimpleEventDispatcher<Types.DeviceStatusEnum>();

  /**
   * Fires when a new FromRadio message containing a LogRecord packet has been
   * received from device
   *
   * @event onLogRecord
   */
  public readonly onLogRecord =
    new SimpleEventDispatcher<Protobuf.Mesh.LogRecord>();

  /**
   * Fires when the device receives a meshPacket, returns a timestamp
   *
   * @event onMeshHeartbeat
   */
  public readonly onMeshHeartbeat = new SimpleEventDispatcher<Date>();

  /**
   * Outputs any debug log data (currently serial connections only)
   *
   * @event onDeviceDebugLog
   */
  public readonly onDeviceDebugLog = new SimpleEventDispatcher<Uint8Array>();

  /**
   * Outputs status of pending settings changes
   *
   * @event onpendingSettingsChange
   */
  public readonly onPendingSettingsChange =
    new SimpleEventDispatcher<boolean>();

  /**
   * Fires when a QueueStatus message is generated
   *
   * @event onQueueStatus
   */
  public readonly onQueueStatus =
    new SimpleEventDispatcher<Protobuf.Mesh.QueueStatus>();
}
