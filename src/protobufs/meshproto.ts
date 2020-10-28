/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import * as $protobuf from "protobufjs/light";
import { roots, Root } from "protobufjs/light";

const $root = roots["default"] || (roots["default"] = new Root());

$root.setOptions({
  java_package: "com.geeksville.mesh",
  java_outer_classname: "MeshProtos",
});
$root.addJSON({
  Position: {
    fields: {
      latitudeI: {
        type: "sint32",
        id: 7,
      },
      longitudeI: {
        type: "sint32",
        id: 8,
      },
      altitude: {
        type: "int32",
        id: 3,
      },
      batteryLevel: {
        type: "int32",
        id: 4,
      },
      time: {
        type: "fixed32",
        id: 9,
      },
    },
  },
  Data: {
    fields: {
      typ: {
        type: "Type",
        id: 1,
      },
      payload: {
        type: "bytes",
        id: 2,
      },
    },
    nested: {
      Type: {
        values: {
          OPAQUE: 0,
          CLEAR_TEXT: 1,
          CLEAR_READACK: 2,
        },
      },
    },
  },
  User: {
    fields: {
      id: {
        type: "string",
        id: 1,
      },
      longName: {
        type: "string",
        id: 2,
      },
      shortName: {
        type: "string",
        id: 3,
      },
      macaddr: {
        type: "bytes",
        id: 4,
      },
    },
  },
  RouteDiscovery: {
    fields: {
      route: {
        rule: "repeated",
        type: "int32",
        id: 2,
      },
    },
  },
  RouteError: {
    values: {
      NONE: 0,
      NO_ROUTE: 1,
      GOT_NAK: 2,
      TIMEOUT: 3,
    },
  },
  SubPacket: {
    oneofs: {
      payload: {
        oneof: [
          "position",
          "data",
          "user",
          "routeRequest",
          "routeReply",
          "routeError",
        ],
      },
      ack: {
        oneof: ["successId", "failId"],
      },
    },
    fields: {
      position: {
        type: "Position",
        id: 1,
      },
      data: {
        type: "Data",
        id: 3,
      },
      user: {
        type: "User",
        id: 4,
      },
      routeRequest: {
        type: "RouteDiscovery",
        id: 6,
      },
      routeReply: {
        type: "RouteDiscovery",
        id: 7,
      },
      routeError: {
        type: "RouteError",
        id: 13,
      },
      wantResponse: {
        type: "bool",
        id: 5,
      },
      successId: {
        type: "uint32",
        id: 10,
      },
      failId: {
        type: "uint32",
        id: 11,
      },
      dest: {
        type: "uint32",
        id: 9,
      },
      source: {
        type: "uint32",
        id: 12,
      },
      originalId: {
        type: "uint32",
        id: 2,
      },
    },
  },
  MeshPacket: {
    oneofs: {
      payload: {
        oneof: ["decoded", "encrypted"],
      },
    },
    fields: {
      from: {
        type: "uint32",
        id: 1,
      },
      to: {
        type: "uint32",
        id: 2,
      },
      decoded: {
        type: "SubPacket",
        id: 3,
      },
      encrypted: {
        type: "bytes",
        id: 8,
      },
      id: {
        type: "uint32",
        id: 6,
      },
      rxTime: {
        type: "fixed32",
        id: 9,
      },
      rxSnr: {
        type: "float",
        id: 7,
      },
      hopLimit: {
        type: "uint32",
        id: 10,
      },
      wantAck: {
        type: "bool",
        id: 11,
      },
    },
  },
  Constants: {
    values: {
      Unused: 0,
    },
  },
  ChannelSettings: {
    fields: {
      txPower: {
        type: "int32",
        id: 1,
      },
      modemConfig: {
        type: "ModemConfig",
        id: 3,
      },
      bandwidth: {
        type: "uint32",
        id: 6,
      },
      spreadFactor: {
        type: "uint32",
        id: 7,
      },
      codingRate: {
        type: "uint32",
        id: 8,
      },
      channelNum: {
        type: "uint32",
        id: 9,
      },
      psk: {
        type: "bytes",
        id: 4,
      },
      name: {
        type: "string",
        id: 5,
      },
    },
    nested: {
      ModemConfig: {
        values: {
          Bw125Cr45Sf128: 0,
          Bw500Cr45Sf128: 1,
          Bw31_25Cr48Sf512: 2,
          Bw125Cr48Sf4096: 3,
        },
      },
    },
  },
  RegionCode: {
    values: {
      Unset: 0,
      US: 1,
      EU433: 2,
      EU865: 3,
      CN: 4,
      JP: 5,
      ANZ: 6,
      KR: 7,
      TW: 8,
    },
  },
  GpsOperation: {
    values: {
      GpsOpUnset: 0,
      GpsOpMobile: 2,
      GpsOpTimeOnly: 3,
      GpsOpDisabled: 4,
    },
  },
  LocationSharing: {
    values: {
      LocUnset: 0,
      LocEnabled: 1,
      LocDisabled: 2,
    },
  },
  RadioConfig: {
    fields: {
      preferences: {
        type: "UserPreferences",
        id: 1,
      },
      channelSettings: {
        type: "ChannelSettings",
        id: 2,
      },
    },
    nested: {
      UserPreferences: {
        fields: {
          positionBroadcastSecs: {
            type: "uint32",
            id: 1,
          },
          sendOwnerInterval: {
            type: "uint32",
            id: 2,
          },
          numMissedToFail: {
            type: "uint32",
            id: 3,
          },
          waitBluetoothSecs: {
            type: "uint32",
            id: 4,
          },
          screenOnSecs: {
            type: "uint32",
            id: 5,
          },
          phoneTimeoutSecs: {
            type: "uint32",
            id: 6,
          },
          phoneSdsTimeoutSec: {
            type: "uint32",
            id: 7,
          },
          meshSdsTimeoutSecs: {
            type: "uint32",
            id: 8,
          },
          sdsSecs: {
            type: "uint32",
            id: 9,
          },
          lsSecs: {
            type: "uint32",
            id: 10,
          },
          minWakeSecs: {
            type: "uint32",
            id: 11,
          },
          wifiSsid: {
            type: "string",
            id: 12,
          },
          wifiPassword: {
            type: "string",
            id: 13,
          },
          wifiApMode: {
            type: "bool",
            id: 14,
          },
          region: {
            type: "RegionCode",
            id: 15,
          },
          isRouter: {
            type: "bool",
            id: 37,
          },
          isLowPower: {
            type: "bool",
            id: 38,
          },
          factoryReset: {
            type: "bool",
            id: 100,
          },
          locationShare: {
            type: "LocationSharing",
            id: 32,
          },
          gpsOperation: {
            type: "GpsOperation",
            id: 33,
          },
          gpsUpdateInterval: {
            type: "uint32",
            id: 34,
          },
          gpsAttemptTime: {
            type: "uint32",
            id: 36,
          },
          ignoreIncoming: {
            rule: "repeated",
            type: "uint32",
            id: 103,
          },
        },
      },
    },
  },
  NodeInfo: {
    fields: {
      num: {
        type: "uint32",
        id: 1,
      },
      user: {
        type: "User",
        id: 2,
      },
      position: {
        type: "Position",
        id: 3,
      },
      snr: {
        type: "float",
        id: 7,
      },
      nextHop: {
        type: "uint32",
        id: 5,
      },
    },
  },
  MyNodeInfo: {
    fields: {
      myNodeNum: {
        type: "uint32",
        id: 1,
      },
      hasGps: {
        type: "bool",
        id: 2,
      },
      numChannels: {
        type: "int32",
        id: 3,
      },
      region: {
        type: "string",
        id: 4,
      },
      hwModel: {
        type: "string",
        id: 5,
      },
      firmwareVersion: {
        type: "string",
        id: 6,
      },
      errorCode: {
        type: "uint32",
        id: 7,
      },
      errorAddress: {
        type: "uint32",
        id: 8,
      },
      errorCount: {
        type: "uint32",
        id: 9,
      },
      packetIdBits: {
        type: "uint32",
        id: 10,
      },
      currentPacketId: {
        type: "uint32",
        id: 11,
      },
      nodeNumBits: {
        type: "uint32",
        id: 12,
      },
      messageTimeoutMsec: {
        type: "uint32",
        id: 13,
      },
      minAppVersion: {
        type: "uint32",
        id: 14,
      },
    },
  },
  DeviceState: {
    fields: {
      radio: {
        type: "RadioConfig",
        id: 1,
      },
      myNode: {
        type: "MyNodeInfo",
        id: 2,
      },
      owner: {
        type: "User",
        id: 3,
      },
      nodeDb: {
        rule: "repeated",
        type: "NodeInfo",
        id: 4,
      },
      receiveQueue: {
        rule: "repeated",
        type: "MeshPacket",
        id: 5,
      },
      version: {
        type: "uint32",
        id: 8,
      },
      rxTextMessage: {
        type: "MeshPacket",
        id: 7,
      },
      noSave: {
        type: "bool",
        id: 9,
      },
      didGpsReset: {
        type: "bool",
        id: 11,
      },
    },
  },
  DebugString: {
    fields: {
      message: {
        type: "string",
        id: 1,
      },
    },
  },
  FromRadio: {
    oneofs: {
      variant: {
        oneof: [
          "packet",
          "myInfo",
          "nodeInfo",
          "radio",
          "debugString",
          "configCompleteId",
          "rebooted",
        ],
      },
    },
    fields: {
      num: {
        type: "uint32",
        id: 1,
      },
      packet: {
        type: "MeshPacket",
        id: 2,
      },
      myInfo: {
        type: "MyNodeInfo",
        id: 3,
      },
      nodeInfo: {
        type: "NodeInfo",
        id: 4,
      },
      radio: {
        type: "RadioConfig",
        id: 6,
      },
      debugString: {
        type: "DebugString",
        id: 7,
      },
      configCompleteId: {
        type: "uint32",
        id: 8,
      },
      rebooted: {
        type: "bool",
        id: 9,
      },
    },
  },
  ToRadio: {
    oneofs: {
      variant: {
        oneof: ["packet", "wantConfigId", "setRadio", "setOwner"],
      },
    },
    fields: {
      packet: {
        type: "MeshPacket",
        id: 1,
      },
      wantConfigId: {
        type: "uint32",
        id: 100,
      },
      setRadio: {
        type: "RadioConfig",
        id: 101,
      },
      setOwner: {
        type: "User",
        id: 102,
      },
    },
  },
  ManufacturingData: {
    fields: {
      fradioFreq: {
        type: "uint32",
        id: 1,
      },
      hwModel: {
        type: "string",
        id: 2,
      },
      hwVersion: {
        type: "string",
        id: 3,
      },
      selftestResult: {
        type: "sint32",
        id: 4,
      },
    },
  },
});

export { $root as default };
