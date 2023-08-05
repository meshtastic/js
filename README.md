# Meshtastic.js

[![NPM](https://badgen.net/npm/v/@meshtastic/meshtasticjs)](https://www.npmjs.com/package/@meshtastic/meshtasticjs)
[![Downloads](https://badgen.net/npm/dt/@meshtastic/meshtasticjs)](https://www.npmjs.com/package/@meshtastic/meshtasticjs)
[![CI](https://img.shields.io/github/actions/workflow/status/meshtastic/js/ci.yml?branch=master&label=actions&logo=github&color=yellow)](https://github.com/meshtastic/js/actions/workflows/ci.yml)
[![CLA assistant](https://cla-assistant.io/readme/badge/meshtastic/meshtastic.js)](https://cla-assistant.io/meshtastic/meshtastic.js)
[![Fiscal Contributors](https://opencollective.com/meshtastic/tiers/badge.svg?label=Fiscal%20Contributors&color=deeppink)](https://opencollective.com/meshtastic/)
[![Vercel](https://img.shields.io/static/v1?label=Powered%20by&message=Vercel&style=flat&logo=vercel&color=000000)](https://vercel.com?utm_source=meshtastic&utm_campaign=oss)

## Overview

Meshtastic.js is a JavaScript library that provides an interface to [Meshtastic](https://meshtastic.org) devices. It can be used to build applications to interface with [Meshtastic](https://meshtastic.org) networks, via HTTP(S), Web Bluetooth or Web Serial.

**[Getting Started Guide](https://meshtastic.org/docs/development/js)**

**[Documentation/API Reference](https://js.meshtastic.org)**

## Stats

![Alt](https://repobeats.axiom.co/api/embed/5330641586e92a2ec84676fedb98f6d4a7b25d69.svg "Repobeats analytics image")

## Installation & Usage

The library is available from [NPM](https://www.npmjs.com/package/@meshtastic/meshtasticjs) and can be installed with:

```bash
pnpm add @meshtastic/meshtasticjs
```

## Development & Building

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
