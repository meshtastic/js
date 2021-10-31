import nodeFetch from "node-fetch";

import { Types } from "./index.js";
import { LogRecord_Level } from "./generated/mesh.js";
import { IMeshDevice } from "./imeshdevice.js";
import type { HTTPConnectionParameters } from "./types.js";
import { typedArrayToBuffer } from "./utils/general.js";
import { log } from "./utils/logging.js";

if (!globalThis.fetch) {
  //@ts-ignore fetch polyfill
  globalThis.fetch = nodeFetch;
}

/**
 * Allows to connect to a Meshtastic device over HTTP(S)
 */
export class IHTTPConnection extends IMeshDevice {
  /**
   * URL of the device that is to be connected to.
   */
  url: string | undefined;

  /**
   * Enables receiving messages all at once, versus one per request
   */
  receiveBatchRequests: boolean | undefined;

  constructor() {
    super();

    this.url = undefined;

    this.receiveBatchRequests = false;
  }

  /**
   * Initiates the connect process to a Meshtastic device via HTTP(S)
   * @param parameters http connection parameters
   */
  public async connect(parameters: HTTPConnectionParameters): Promise<void> {
    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTING);

    this.receiveBatchRequests = parameters.receiveBatchRequests;

    if (!this.url) {
      this.url = `${parameters.tls ? "https://" : "http://"}${
        parameters.address
      }`;
    }
    if (await this.ping()) {
      log(
        `IHTTPConnection.connect`,
        `Ping succeeded, starting configuration and request timer.`,
        LogRecord_Level.DEBUG
      );
      await this.configure();
      setInterval(
        () => {
          this.readFromRadio().catch((e: Error) => {
            log(`IHTTPConnection`, e.message, LogRecord_Level.ERROR);
          });
        },
        parameters.fetchInterval ? parameters.fetchInterval : 5000
      );
    } else {
      setTimeout(() => {
        void this.connect({
          address: parameters.address,
          fetchInterval: parameters.fetchInterval,
          receiveBatchRequests: parameters.receiveBatchRequests,
          tls: parameters.tls
        });
      }, 10000);
    }
  }

  /**
   * Disconnects from the Meshtastic device
   */
  public disconnect(): void {
    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
    this.complete();
  }

  /**
   * Pings device to check if it is avaliable
   */
  public async ping(): Promise<boolean> {
    log(
      `IHTTPConnection.connect`,
      `Attempting device ping.`,
      LogRecord_Level.DEBUG
    );

    let pingSuccessful = false;

    await fetch(`${this.url}/hotspot-detect.html`, {})
      .then(() => {
        pingSuccessful = true;
        this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTED);
      })
      .catch(({ message }: { message: string }) => {
        pingSuccessful = false;
        log(`IHTTPConnection.connect`, message, LogRecord_Level.ERROR);
        this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_RECONNECTING);
      });
    return pingSuccessful;
  }

  /**
   * Reads any avaliable protobuf messages from the radio
   */
  protected async readFromRadio(): Promise<void> {
    let readBuffer = new ArrayBuffer(1);

    while (readBuffer.byteLength > 0) {
      await fetch(
        `${this.url}/api/v1/fromradio?all=${
          this.receiveBatchRequests ? "true" : "false"
        }`,
        {
          method: "GET",
          headers: {
            Accept: "application/x-protobuf"
          }
        }
      )
        .then(async (response) => {
          this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTED);

          readBuffer = await response.arrayBuffer();

          if (readBuffer.byteLength > 0) {
            await this.handleFromRadio(new Uint8Array(readBuffer, 0));
          }
        })
        .catch(({ message }: { message: string }) => {
          log(`IHTTPConnection.readFromRadio`, message, LogRecord_Level.ERROR);

          this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_RECONNECTING);
        });
    }
  }

  /**
   * Sends supplied protobuf message to the radio
   */
  protected async writeToRadio(data: Uint8Array): Promise<void> {
    await fetch(`${this.url}/api/v1/toradio`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/x-protobuf"
      },
      body: typedArrayToBuffer(data)
    })
      .then(async () => {
        this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTED);

        await this.readFromRadio().catch((e: Error) => {
          log(`IHTTPConnection`, e.message, LogRecord_Level.ERROR);
        });
      })
      .catch(({ message }: { message: string }) => {
        log(`IHTTPConnection.writeToRadio`, message, LogRecord_Level.ERROR);
        this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_RECONNECTING);
      });
  }

  /**
   * Web API method: Restart device
   */
  public async restartDevice(): Promise<void> {
    return fetch(`${this.url}/restart`, {
      method: "POST"
    })
      .then(() => {
        this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_RESTARTING);
      })
      .catch(({ message }: { message: string }) => {
        log(`IHTTPConnection.restartDevice`, message, LogRecord_Level.ERROR);
      });
  }

  /**
   * Web API method: Get airtime statistics
   */
  public async getStatistics(): Promise<void | Types.WebStatisticsResponse> {
    return fetch(`${this.url}/json/report`, {
      method: "GET"
    })
      .then(async (response) => {
        return (await response.json()) as Types.WebStatisticsResponse;
      })
      .catch(({ message }: { message: string }) => {
        log(`IHTTPConnection.getStatistics`, message, LogRecord_Level.ERROR);
      });
  }

  /**
   * Web API method: Scan for WiFi AP's
   */
  public async getNetworks(): Promise<void | Types.WebNetworkResponse> {
    return fetch(`${this.url}/json/scanNetworks`, {
      method: "GET"
    })
      .then(async (response) => {
        return (await response.json()) as Types.WebNetworkResponse;
      })
      .catch(({ message }: { message: string }) => {
        log(`IHTTPConnection.getNetworks`, message, LogRecord_Level.ERROR);
      });
  }

  /**
   * Web API method: Fetch SPIFFS contents
   */
  public async getSPIFFS(): Promise<void | Types.WebSPIFFSResponse> {
    return fetch(`${this.url}/json/spiffs/browse/static`, {
      method: "GET"
    })
      .then(async (response) => {
        return (await response.json()) as Types.WebSPIFFSResponse;
      })
      .catch(({ message }: { message: string }) => {
        log(`IHTTPConnection.getSPIFFS`, message, LogRecord_Level.ERROR);
      });
  }

  /**
   * Web API method: Delete SPIFFS file
   */
  public async deleteSPIFFS(
    file: string
  ): Promise<void | Types.WebSPIFFSResponse> {
    return fetch(
      `${this.url}/json/spiffs/delete/static?${new URLSearchParams({
        delete: file
      }).toString()}`,
      {
        method: "DELETE"
      }
    )
      .then(async (response) => {
        return (await response.json()) as Types.WebSPIFFSResponse;
      })
      .catch(({ message }: { message: string }) => {
        log(`IHTTPConnection.deleteSPIFFS`, message, LogRecord_Level.ERROR);
      });
  }

  /**
   * Web API method: Make device LED blink
   * @todo, strongly type response
   */
  public async blinkLED(): Promise<void | Response> {
    return fetch(`${this.url}/json/blink`, {
      method: "POST"
    }).catch(({ message }: { message: string }) => {
      log(`IHTTPConnection.blinkLED`, message, LogRecord_Level.ERROR);
    });
  }
}
