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

#### Usage

The library has a built in connection manager that will handle multiple devices of different connection types.

```typescript
import {
  Client,
  Types,
  SettingsManager,
} from "meshtasticjs";

/**
 * Instantiate a new device manager
 */
const client = new Client();

/**
 * Optional: Set the logging level
 */
SettingsManager.setDebugMode(Protobuf.LogLevelEnum.DEBUG);

/**
 * Create the connection type of your choice
 */
const httpConnection = client.createHTTPConnection();
const bleConnection = client.createBLEConnection();

/**
 * Connect to the device with the desired paramaters
 */
httpConnection.connect(...connectionParams);
bleConnection.connect(...connectionParams);

/**
 * Device can now be accessed individually or via `deviceInterfaces`
 */
client.deviceInterfaces.forEach(connection => {
  ...
});
```

All events can be handled via any of the inbuilt on**_x_**Event methods.

```typescript
httpConnection.onFromRadioEvent.subscribe(event => {
    ...
});
```

### Sending data

Data in multiple formats can be send over the radio

```typescript
/**
 * Plaintext message
 */
bleConnection.sendText("Message");

/**
 * With recipient
 */
bleConnection.sendText("Message", 1234);

/**
 * Arbitrary data
 */
bleConnection.sendData(
  new Uint8Array([...data]),
  Protobuf.PortNumEnum.PRIVATE_APP
);

/**
 * Send custom location
 */
bleConnection.sendPosition(lat, lng, alt, time);
```

### Compatibility

The Bluetooth connection option relies on the availability of the Web Bluetooth API, which is represented in the compatibility matrix below.

![](https://caniuse.bitsofco.de/image/web-bluetooth.png)
