import { HttpConnection } from "./dist"

const Connect = async () => {
  console.log("Running...");
  const connection = new HttpConnection()
  await connection.connect({
    address: "meshtastic.local",
    fetchInterval: 2000,
    tls: false,
  });

  connection.events.onMessagePacket.subscribe((packet) => {
    onMessage(packet.from, packet.data)
  })

  connection.events.onPrivatePacket.subscribe((packet) => {
    onMessage(packet.from, packet.data)
  })
}

const onMessage = (sender, message) => {
  console.log("Message from: " + sender);
  console.log("Message was: " + String(message));
}

Connect();