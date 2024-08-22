import { NodeSerialConnection } from "./dist/index.js";
import { SerialPort } from "serialport";

const Connect = async () => {
  const connection = new NodeSerialConnection();
  await connection.connect({
    portPath: "COM4",
    concurrentLogOutput: false,
  });
  console.log(await SerialPort.list());
  connection.events.onMessagePacket.subscribe((packet) => {
    onMessage(packet.from, packet.data);
  });

  connection.events.onPrivatePacket.subscribe((packet) => {
    onMessage(packet.from, packet.data);
  });

  connection.events.onLogEvent.subscribe((packet) => {
    console.log("LogEvent: ", packet);
  });

  connection.events.onDeviceMetadataPacket.subscribe((packet) => {
    console.log("DeviceMetadataPacket: ", packet);
  });

  connection.events.onDeviceDebugLog.subscribe((packet) => {
    console.log("DeviceDebugLog: ", packet);
  });

  connection.events.onFromRadio.subscribe((packet) => {
    console.log("FromRadio: ", packet);
  });

  connection.events.onDeviceStatus.subscribe((packet) => {
    console.log("DeviceStatus: ", packet);
  });

  connection.events.onMyNodeInfo.subscribe((packet) => {
    console.log("NodeInfo: ", packet);
  });
  const onMessage = (sender, message) => {
    console.log("Message from: " + sender);
    console.log("Message was: " + message);
  };

  connection.events.onRemoteHardwarePacket.subscribe((packet) => {
    console.log("Remote Hardware Packet: ", packet);
  });

  connection.events.onRoutingPacket.subscribe((packet) => {
    console.log("Routing packet: ", packet);
  });

  connection.events.onConfigPacket.subscribe((packet) => {
    console.log("Config: ", packet);
  });

  // Request configuration data from device (I think this will help trigger other serial events being processed)
  await connection.configure();

};

Connect().catch((err) => {
  console.log(err);
});
