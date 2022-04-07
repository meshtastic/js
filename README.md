# Meshtastic.js

[![Open in Visual Studio Code](https://open.vscode.dev/badges/open-in-vscode.svg)](https://open.vscode.dev/meshtastic/meshtastic.js) ![NPM](https://badgen.net/npm/v/@meshtastic/meshtasticjs) ![Downloads](https://badgen.net/npm/dt/@meshtastic/meshtasticjs) [![CI](https://github.com/meshtastic/meshtastic.js/actions/workflows/ci.yml/badge.svg)](https://github.com/meshtastic/meshtastic.js/actions/workflows/ci.yml)
[![CLA assistant](https://cla-assistant.io/readme/badge/meshtastic/meshtastic.js)](https://cla-assistant.io/meshtastic/meshtastic.js)

## Overview

Meshtastic.js is a JavaScript library that provides an interface to [Meshtastic](https://meshtastic.org) devices. It can be used to build applications to interface with a [Meshtastic](https://meshtastic.org) networks, via HTTP(S), Web Bluetooth or Web Serial.

**[Getting Started Guide](https://meshtastic.org/docs/software/js/getting-started)**
**[Documentation/API Reference](https://js.meshtastic.org)**

## Installation & Usage

The library is available from [NPM](https://www.npmjs.com/package/@meshtastic/meshtasticjs) and can be installed with:

```bash
pnpm add @meshtastic/meshtasticjs
```

## Development & Building

The [Meshtastic Protobufs submodule](https://github.com/meshtastic/meshtastic-protobufs/) must be pulled, this can be done via:

```bash
git submodule update --init
```

Then the type definitions need to be generated:

```bash
pnpm generate:protobufs
```

Finally the project can be built:

```bash
pnpm build
```

Optionally the doccumentation can be built with:

```bash
pnpm generate:docs
```

### Compatibility

The Bluetooth and Serial connections rely on the availability of the Web Bluetooth and Web Serial API's respectively, this is represented in the compatibility matrices below.

![Web Bluetooth compatability matrix](https://caniuse.bitsofco.de/image/web-bluetooth.png)
![Web Serial compatability matrix](https://caniuse.bitsofco.de/image/web-serial.png)

[![Powered by Vercel](https://raw.githubusercontent.com/abumalick/powered-by-vercel/master/powered-by-vercel.svg)](https://vercel.com?utm_source=meshtastic&utm_campaign=oss)
