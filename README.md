# Meshtastic.js

[![NPM](https://badgen.net/npm/v/@meshtastic/meshtasticjs)](https://www.npmjs.com/package/@meshtastic/meshtasticjs)
[![Downloads](https://badgen.net/npm/dt/@meshtastic/meshtasticjs)](https://www.npmjs.com/package/@meshtastic/meshtasticjs)
[![CI](https://img.shields.io/github/workflow/status/meshtastic/meshtastic.js/CI?label=actions&logo=github&color=yellow)](https://github.com/meshtastic/meshtastic.js/actions/workflows/ci.yml)
[![CLA assistant](https://cla-assistant.io/readme/badge/meshtastic/meshtastic.js)](https://cla-assistant.io/meshtastic/meshtastic.js)
[![Fiscal Contributors](https://opencollective.com/meshtastic/tiers/badge.svg?label=Fiscal%20Contributors&color=deeppink)](https://opencollective.com/meshtastic/)
[![Vercel](https://img.shields.io/static/v1?label=Powered%20by&message=Vercel&style=flat&logo=vercel&color=000000)](https://vercel.com?utm_source=meshtastic&utm_campaign=oss)

## Overview

Meshtastic.js is a JavaScript library that provides an interface to [Meshtastic](https://meshtastic.org) devices. It can be used to build applications to interface with a [Meshtastic](https://meshtastic.org) device, via HTTP(S), Web Bluetooth or Web Serial.

**[Getting Started Guide](https://meshtastic.org/docs/software/js/getting-started)**

**[Documentation/API Reference](https://js.meshtastic.org)**

## Stats

![Alt](https://repobeats.axiom.co/api/embed/8a0bb0a0222172b4eda88c3119b8291813a83994.svg "Repobeats analytics image")

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
