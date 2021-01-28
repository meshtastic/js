export enum ConnectionEventEnum {
  DEVICE_CONNECTED,
  DEVICE_DISCONNECTED,
  DEVICE_RECONNECTIONG,
  DEVICE_RECONNECTED,
}

export interface HTTPTransaction {
  status: number;
  interaction_time: number;
  consecutiveFailedRequests?: number;
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
