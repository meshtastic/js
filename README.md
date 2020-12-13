# Meshtastic.js

![](https://badgen.net/npm/v/@meshtastic/meshtasticjs) ![](https://badgen.net/npm/dt/@meshtastic/meshtasticjs) ![](https://badgen.net/bundlephobia/minzip/@meshtastic/meshtasticjs) ![](https://badgen.net/bundlephobia/dependency-count/@meshtastic/meshtasticjs) ![](https://badgen.net/bundlephobia/tree-shaking/@meshtastic/meshtasticjs)

## Overview

Meshtastic.js is a JavaScript library that provides an interface to [Meshtastic](https://meshtastic.org) devices. It can be used to build applications to interface with a [Meshtastic](https://meshtastic.org) network. Currently HTTP(S) and Bluetooth connections are supported.

**[Documentation/API Reference](https://js.meshtastic.org)**

## Installation & Usage

The library is available from [NPM](https://www.npmjs.com/package/@meshtastic/meshtasticjs) and can be installed with:

```bash
yarn add @meshtastic/meshtasticjs
```

```bash
npm install @meshtastic/meshtasticjs
```

If you prefer a pre-bundled version you can generate one with the following command from inside the projects folder:

```bash
npm run build && npm install --global webpack-cli && webpack-cli --entry ./dist -o dist/bundle.js
```

```bash
yarn build && yarn global add webpack-cli && webpack-cli --entry ./dist -o dist/bundle.js
```

#### Usage

The library has a built in connection manager that will handle multiple devices of different connection types.

```typescript
import { Client } from "meshtasticjs";

// Instantiate a new device manager
const client = new Client();

// Create the connection type of your choice
const httpConnection = client.createHTTPConnection();
const bleConnection = client.createBLEConnection();

// connect to the device with the desired paramaters
httpConnection.connect(...connectionParams);
bleConnection.connect(...connectionParams);

// Device can now be accessed individually or via `deviceInterfaces`
client.deviceInterfaces.forEach(connection => {
  ...
})
```

All events can be handled via any of the inbuilt on**_x_**Event methods.

```typescript
// Avaliable methods: onFromRadioEvent, onDataPacketEvent, onUserPacketEvent,
// onPositionPacketEvent, onConnectedEvent, onDisconnectedEvent, onConfigDoneEvent
httpConnection.onFromRadioEvent.subscribe(event => {
    ...
})
```

### Sending data

Data in multiple formats can be send over the radio

```typescript
// Plain text message
bleConnection.sendText("Message");

// With recipient
bleConnection.sendText("Message", 1234);

// Arbitrary data
bleConnection.sendData(new Uint8Array([...data]));

// Send custom location
bleConnection.sendPosition(lat, lng, alt, time);
```
