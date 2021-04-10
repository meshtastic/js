import type { IBLEConnection, IHTTPConnection, ISerialConnection } from "./";
import type { AdminMessage } from "./generated/admin";
import type { MeshPacket, NodeInfo, Position, Routing } from "./generated/mesh";

export enum DeviceStatusEnum {
  DEVICE_RESTARTING,
  DEVICE_DISCONNECTED,
  DEVICE_CONNECTING,
  DEVICE_RECONNECTING,
  DEVICE_CONNECTED,
  DEVICE_CONFIGURING,
  DEVICE_CONFIGURED
}

export type DeviceInterface =
  | IHTTPConnection
  | IBLEConnection
  | ISerialConnection;

export type ConnectionParameters =
  | httpConnectionParameters
  | bleConnectionParameters
  | serialConnectionParameters;

export interface httpConnectionParameters {
  /**
   * address The IP Address/Domain to connect to, without protocol
   */
  address: string;
  /**
   * Enables transport layer security. Notes: Slower, devices' certificate must be trusted by the browser
   */
  tls?: boolean;
  /**
   * Enables receiving messages all at once, versus one per request
   */
  receiveBatchRequests?: boolean;
  /**
   * (ms) Sets a fixed interval in that the device is fetched for new messages, defaults to 5 seconds
   */
  fetchInterval: number;
}

export interface bleConnectionParameters {
  /**
   * Optional filter options for the web bluetooth api requestDevice() method
   */
  requestDeviceFilterParams?: RequestDeviceOptions;
}

export interface serialConnectionParameters {
  baudRate?: number;
}
/**
 * @todo temporarily made packet optional, revert!
 */
export interface NodeInfoPacket {
  packet?: MeshPacket;
  data: NodeInfo;
}

export interface AdminPacket {
  packet: MeshPacket;
  data: AdminMessage;
}

export interface RoutingInfoPacket {
  packet: MeshPacket;
  data: Routing;
}

export interface PositionPacket {
  packet: MeshPacket;
  data: Position;
}

export interface TextPacket {
  packet: MeshPacket;
  data: string;
}

interface WebSPIFFSFileInstance {
  nameModified: string;
  name: string;
  size: number;
}

export interface WebSPIFFSResponse {
  data: {
    files: WebSPIFFSFileInstance[];
    filesystem: {
      total: number;
      used: number;
      free: number;
    };
  };
  status: string;
}

export interface WebStatisticsResponse {
  data: {
    airtime: {
      tx_log: number[];
      rx_log: number[];
      rx_all_log: number[];
      seconds_since_boot: number;
      seconds_per_period: number;
      periods_to_log: number;
    };
    wifi: {
      web_request_count: number;
      rssi: number;
      ip: string;
    };
    memory: {
      heap_total: number;
      heap_free: number;
      psram_total: number;
      psram_free: number;
      spiffs_total: number;
      spiffs_used: number;
      spiffs_free: number;
    };
    power: {
      battery_percent: number;
      battery_voltage_mv: number;
      has_battery: boolean;
      has_usb: boolean;
      is_charging: boolean;
      radio: {
        frequecy: number;
        lora_channel: number;
      };
    };
  };
  status: string;
}

interface WebNetworkInstance {
  ssid: string;
  rssi: number;
}

export interface WebNetworkResponse {
  data: {
    networks: WebNetworkInstance[];
  };
  status: string;
}
