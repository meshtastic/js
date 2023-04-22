import { SubEvent } from "sub-events";
export class EventSystem {
    /**
     * Fires when a new FromRadio message has been received from the device
     *
     * @event onLogEvent
     */
    onLogEvent = new SubEvent();
    /**
     * Fires when a new FromRadio message has been received from the device
     *
     * @event onFromRadio
     */
    onFromRadio = new SubEvent();
    /**
     * Fires when a new FromRadio message containing a Data packet has been
     * received from the device
     *
     * @event onMeshPacket
     */
    onMeshPacket = new SubEvent();
    /**
     * Fires when a new MyNodeInfo message has been received from the device
     *
     * @event onMyNodeInfo
     */
    onMyNodeInfo = new SubEvent();
    /**
     * Fires when a new MeshPacket message containing a NodeInfo packet has been
     * received from device
     *
     * @event onNodeInfoPacket
     */
    onNodeInfoPacket = new SubEvent();
    /**
     * Fires when a new MeshPacket message containing a User packet has been
     * received from device
     *
     * @event onUserPacket
     */
    onUserPacket = new SubEvent();
    /**
     * Fires when a new Channel message is recieved
     *
     * @event onChannelPacket
     */
    onChannelPacket = new SubEvent();
    /**
     * Fires when a new Config message is recieved
     *
     * @event onConfigPacket
     */
    onConfigPacket = new SubEvent();
    /**
     * Fires when a new ModuleConfig message is recieved
     *
     * @event onModuleConfigPacket
     */
    onModuleConfigPacket = new SubEvent();
    /**
     * Fires when a new MeshPacket message containing a Ping packet has been
     * received from device
     *
     * @event onPingPacket
     */
    onPingPacket = new SubEvent();
    /**
     * Fires when a new MeshPacket message containing a IP Tunnel packet has been
     * received from device
     *
     * @event onIpTunnelPacket
     */
    onIpTunnelPacket = new SubEvent();
    /**
     * Fires when a new MeshPacket message containing a Serial packet has been
     * received from device
     *
     * @event onSerialPacket
     */
    onSerialPacket = new SubEvent();
    /**
     * Fires when a new MeshPacket message containing a Store and Forward packet
     * has been received from device
     *
     * @event onStoreForwardPacket
     */
    onStoreForwardPacket = new SubEvent();
    /**
     * Fires when a new MeshPacket message containing a Store and Forward packet
     * has been received from device
     *
     * @event onRangeTestPacket
     */
    onRangeTestPacket = new SubEvent();
    /**
     * Fires when a new MeshPacket message containing a Telemetry packet has been
     * received from device
     *
     * @event onTelemetryPacket
     */
    onTelemetryPacket = new SubEvent();
    /**
     * Fires when a new MeshPacket message containing a Private packet has been
     * received from device
     *
     * @event onPrivatePacket
     */
    onPrivatePacket = new SubEvent();
    /**
     * Fires when a new MeshPacket message containing a ATAK packet has been
     * received from device
     *
     * @event onAtakPacket
     */
    onAtakPacket = new SubEvent();
    /**
     * Fires when a new MeshPacket message containing a Routing packet has been
     * received from device
     *
     * @event onRoutingPacket
     */
    onRoutingPacket = new SubEvent();
    /**
     * Fires when a new MeshPacket message containing a Position packet has been
     * received from device
     *
     * @event onPositionPacket
     */
    onPositionPacket = new SubEvent();
    /**
     * Fires when a new MeshPacket message containing a Text packet has been
     * received from device
     *
     * @event onMessagePacket
     */
    onMessagePacket = new SubEvent();
    /**
     * Fires when a new MeshPacket message containing a Remote Hardware packet has
     * been received from device
     *
     * @event onRemoteHardwarePacket
     */
    onRemoteHardwarePacket = new SubEvent();
    /**
     * Fires when a new MeshPacket message containing a Waypoint packet has been
     * received from device
     *
     * @event onWaypointPacket
     */
    onWaypointPacket = new SubEvent();
    /**
     * Fires when the devices connection or configuration status changes
     *
     * @event onDeviceStatus
     */
    onDeviceStatus = new SubEvent();
    /**
     * Fires when a new FromRadio message containing a LogRecord packet has been
     * received from device
     *
     * @event onLogRecord
     */
    onLogRecord = new SubEvent();
    /**
     * Fires when the device receives a meshPacket, returns a timestamp
     *
     * @event onMeshHeartbeat
     */
    onMeshHeartbeat = new SubEvent();
    /**
     * Outputs any debug log data (currently serial connections only)
     *
     * @event onDeviceDebugLog
     */
    onDeviceDebugLog = new SubEvent();
    /**
     * Fires when the device receives a Metadata packet
     *
     * @event onDeviceMetadataPacket
     */
    onDeviceMetadataPacket = new SubEvent();
    /**
     * Outputs status of pending settings changes
     *
     * @event pendingSettingsChange
     */
    onPendingSettingsChange = new SubEvent();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnRTeXN0ZW0uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdXRpbHMvZXZlbnRTeXN0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUl0QyxNQUFNLE9BQU8sV0FBVztJQUN0Qjs7OztPQUlHO0lBQ2EsVUFBVSxHQUFHLElBQUksUUFBUSxFQUF3QixDQUFDO0lBRWxFOzs7O09BSUc7SUFDYSxXQUFXLEdBQUcsSUFBSSxRQUFRLEVBQXNCLENBQUM7SUFFakU7Ozs7O09BS0c7SUFDYSxZQUFZLEdBQUcsSUFBSSxRQUFRLEVBQXVCLENBQUM7SUFFbkU7Ozs7T0FJRztJQUNhLFlBQVksR0FBRyxJQUFJLFFBQVEsRUFBdUIsQ0FBQztJQUVuRTs7Ozs7T0FLRztJQUNhLGdCQUFnQixHQUFHLElBQUksUUFBUSxFQUFxQixDQUFDO0lBRXJFOzs7OztPQUtHO0lBQ2EsWUFBWSxHQUFHLElBQUksUUFBUSxFQUFpQyxDQUFDO0lBRTdFOzs7O09BSUc7SUFDYSxlQUFlLEdBQUcsSUFBSSxRQUFRLEVBQW9CLENBQUM7SUFFbkU7Ozs7T0FJRztJQUNhLGNBQWMsR0FBRyxJQUFJLFFBQVEsRUFBbUIsQ0FBQztJQUVqRTs7OztPQUlHO0lBQ2Esb0JBQW9CLEdBQUcsSUFBSSxRQUFRLEVBQXlCLENBQUM7SUFFN0U7Ozs7O09BS0c7SUFDYSxZQUFZLEdBQUcsSUFBSSxRQUFRLEVBQThCLENBQUM7SUFFMUU7Ozs7O09BS0c7SUFFYSxnQkFBZ0IsR0FBRyxJQUFJLFFBQVEsRUFBOEIsQ0FBQztJQUU5RTs7Ozs7T0FLRztJQUVhLGNBQWMsR0FBRyxJQUFJLFFBQVEsRUFBOEIsQ0FBQztJQUM1RTs7Ozs7T0FLRztJQUNhLG9CQUFvQixHQUFHLElBQUksUUFBUSxFQUVoRCxDQUFDO0lBRUo7Ozs7O09BS0c7SUFDYSxpQkFBaUIsR0FBRyxJQUFJLFFBQVEsRUFFN0MsQ0FBQztJQUVKOzs7OztPQUtHO0lBQ2EsaUJBQWlCLEdBQUcsSUFBSSxRQUFRLEVBRTdDLENBQUM7SUFFSjs7Ozs7T0FLRztJQUNhLGVBQWUsR0FBRyxJQUFJLFFBQVEsRUFBOEIsQ0FBQztJQUU3RTs7Ozs7T0FLRztJQUNhLFlBQVksR0FBRyxJQUFJLFFBQVEsRUFBOEIsQ0FBQztJQUUxRTs7Ozs7T0FLRztJQUNhLGVBQWUsR0FBRyxJQUFJLFFBQVEsRUFFM0MsQ0FBQztJQUVKOzs7OztPQUtHO0lBQ2EsZ0JBQWdCLEdBQUcsSUFBSSxRQUFRLEVBRTVDLENBQUM7SUFFSjs7Ozs7T0FLRztJQUNhLGVBQWUsR0FBRyxJQUFJLFFBQVEsRUFBMEIsQ0FBQztJQUV6RTs7Ozs7T0FLRztJQUNhLHNCQUFzQixHQUFHLElBQUksUUFBUSxFQUVsRCxDQUFDO0lBRUo7Ozs7O09BS0c7SUFDYSxnQkFBZ0IsR0FBRyxJQUFJLFFBQVEsRUFFNUMsQ0FBQztJQUVKOzs7O09BSUc7SUFDYSxjQUFjLEdBQUcsSUFBSSxRQUFRLEVBQTBCLENBQUM7SUFFeEU7Ozs7O09BS0c7SUFDYSxXQUFXLEdBQUcsSUFBSSxRQUFRLEVBQXNCLENBQUM7SUFFakU7Ozs7T0FJRztJQUNhLGVBQWUsR0FBRyxJQUFJLFFBQVEsRUFBUSxDQUFDO0lBRXZEOzs7O09BSUc7SUFDYSxnQkFBZ0IsR0FBRyxJQUFJLFFBQVEsRUFBYyxDQUFDO0lBRTlEOzs7O09BSUc7SUFDYSxzQkFBc0IsR0FBRyxJQUFJLFFBQVEsRUFFbEQsQ0FBQztJQUVKOzs7O09BSUc7SUFDYSx1QkFBdUIsR0FBRyxJQUFJLFFBQVEsRUFBVyxDQUFDO0NBQ25FIn0=