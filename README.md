# Meshtastic.js

## Overview

Meshtastic.js is a javascript library that provides an interface to Meshtastic devices. It can be used to build applications interacting with the Meshtastic network natively in the browser. Currently HTTP(S) and bluetooth connections are possible.

Supported features:

- Connect to multiple meshtastic devices via bluetooth
- Start configuration process on connect
- Get device info and node database
- Receive messages from device
- Send messages (text, position, data, packet)
- Set device preferences
- Set owner data

[Documentation/API Reference](https://meshtastic.github.io/meshtastic.js) (work in progress)

## Installation & Usage

### Basic Init

This includes meshtastic.js into an html file and makes it available through the global variable meshtasticjs and creates a new meshtastic client instance and initializes the client:

#### Generic usage

```html
<script src="path/to/meshtastic.js"></script>
```

```javascript
var client = new meshtasticjs.Client();
```

#### ES6

```typescript
import { Client } from "meshtasticjs";

const client = new Client();
```

After that, a new connection can be created. it returns an IBLEConnection interface:

```javascript
const connectionOne = client.createBLEConnection();
```

The connection interface provides events that can be listened on:

- `fromRadio` Gets called whenever a fromRadio message is received from device, returns fromRadio data object in event.detail
- `dataPacket` Gets called when a data packet is received from device, returns fromRadio data object in event.detail
- `userPacket` Gets called when a user packet is received from device, returns fromRadio data object in event.detail
- `positionPacket` Gets called when a position packet is received from device, returns fromRadio data in event.detail
- `nodeListChanged` Gets called when node database has been changed, returns changed node number in event.detail
- `connected` Gets called when link to device is connected
- `disconnected` Gets called when link to device is disconnected
- `configDone` Gets called when device has been configured (myInfo, radio and node data received). device interface is now ready to be used

```typescript
// Registering event listeners
connectionOne.addEventListener("fromRadio", (event) => {
  console.log(event.detail.toJSON());
});
```

### Connect to a device

Now we can connect to the device asynchronously. It returns a promise, so it must be used either in an async/await function or with .then.

**Important: the connect action must be called from a user interaction (e.g. button press), otherwise the browsers won't allow the connect.**

```typescript
connectionOne
  .connect()
  .then((result) => {
    // This code gets executed when the connection has been established
    console.log("Successfully connected!");
  })
  .catch((error) => {
    console.log(error);
  });
```

### Send a text message

Send a text message via the device over the meshtastic radio. If no recipient node is provided, it gets sent as a broadcast:

```typescript
connectionOne
  .sendText("meshtastic is awesome")
  .then((result) => {
    console.log(result);
  })
  .catch((error) => {
    console.log(error);
  });
```

**All calls (if not using then/catch promise syntax) should be wrapped in a try/catch to handle errors.**

For more examples see /examples.

[Documentation/API Reference](https://meshtastic.github.io/meshtastic.js)

## Compatibility

The library is tested with meshtastic devices running firmware versions 0.9.5, 1.0.0 and 1.1.6

Since meshtastic.js relies on the bluetooth web api (https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API), bluetooth connections only work in the later versions of Google Chrome, Opera and Microsoft Edge. On windows systems, the meshtastic device has to be paired via windows settings beforehand once.

### Bluetooth Version Details

- Google Chrome 56+
- Google Chrome for Android 85+
- Microsoft Edge 79+
- Opera 43+

More detailed compatibility information can be found at https://caniuse.com/web-bluetooth

## Build

Clone the library into a local directory and run:

```bash
npm install
```

to fetch the needed dependencies.

To build:

```bash
npm run build
npm run generate-docs
```

## Development

Roadmap for version 1.0:

- Support for serial usb connections
- More granular error management
