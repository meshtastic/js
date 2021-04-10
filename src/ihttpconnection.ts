import { Types } from "./";
import { LogRecord_Level } from "./generated/mesh";
import { IMeshDevice } from "./imeshdevice";
import type { httpConnectionParameters } from "./types";
import { log, typedArrayToBuffer } from "./utils";

/**
 * Allows to connect to a meshtastic device over HTTP(S)
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
   * Initiates the connect process to a meshtastic device via HTTP(S)
   * @param parameters http connection parameters
   */
  public async connect(parameters: httpConnectionParameters): Promise<void> {
    this.onDeviceStatusEvent.next(Types.DeviceStatusEnum.DEVICE_CONNECTING);

    this.receiveBatchRequests = parameters.receiveBatchRequests;

    if (!this.url) {
      this.url = `${parameters.tls ? "https://" : "http://"}${
        parameters.address
      }`;
    }
    if (await this.ping()) {
      log(
        `IHTTPConnection.connect`,
        `Ping succeeded, starting new request timer.`,
        LogRecord_Level.DEBUG
      );
      setInterval(
        async () => {
          await this.readFromRadio().catch((e) => {
            log(`IHTTPConnection`, e, LogRecord_Level.ERROR);
          });
        },
        parameters.fetchInterval ? parameters.fetchInterval : 5000
      );
    } else {
      setTimeout(() => {
        this.connect({
          address: parameters.address,
          fetchInterval: parameters.fetchInterval,
          receiveBatchRequests: parameters.receiveBatchRequests,
          tls: parameters.tls
        });
      }, 10000);
    }
  }

  /**
   * Disconnects from the meshtastic device
   */
  public disconnect(): void {
    this.onDeviceStatusEvent.next(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
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

    await fetch(this.url + `/hotspot-detect.html`, {})
      .then(async () => {
        pingSuccessful = true;
        this.onDeviceStatusEvent.next(Types.DeviceStatusEnum.DEVICE_CONNECTED);

        await this.configure();
      })
      .catch((e) => {
        pingSuccessful = false;
        log(`IHTTPConnection.connect`, e.message, LogRecord_Level.ERROR);
        this.onDeviceStatusEvent.next(
          Types.DeviceStatusEnum.DEVICE_RECONNECTING
        );
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
        this.url + `/api/v1/fromradio?all=${this.receiveBatchRequests}`,
        {
          method: "GET",
          headers: {
            Accept: "application/x-protobuf"
          }
        }
      )
        .then(async (response) => {
          /**
           * @todo, is the DEVICE_CONNECTED event duplicated here, why are we checking for the connection status.
           */
          this.onDeviceStatusEvent.next(
            Types.DeviceStatusEnum.DEVICE_CONNECTED
          );

          if (this.deviceStatus < Types.DeviceStatusEnum.DEVICE_CONNECTED) {
            this.onDeviceStatusEvent.next(
              Types.DeviceStatusEnum.DEVICE_CONNECTED
            );
          }

          readBuffer = await response.arrayBuffer();

          if (readBuffer.byteLength > 0) {
            await this.handleFromRadio(new Uint8Array(readBuffer, 0));
          }
        })
        .catch((e) => {
          log(
            `IHTTPConnection.readFromRadio`,
            e.message,
            LogRecord_Level.ERROR
          );

          if (
            this.deviceStatus !== Types.DeviceStatusEnum.DEVICE_RECONNECTING
          ) {
            this.onDeviceStatusEvent.next(
              Types.DeviceStatusEnum.DEVICE_RECONNECTING
            );
          }
        });
    }
  }

  /**
   * Sends supplied protobuf message to the radio
   */
  protected async writeToRadio(ToRadioUInt8Array: Uint8Array): Promise<void> {
    await fetch(`${this.url}/api/v1/toradio`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/x-protobuf"
      },
      body: typedArrayToBuffer(ToRadioUInt8Array)
    })
      .then(async () => {
        this.onDeviceStatusEvent.next(Types.DeviceStatusEnum.DEVICE_CONNECTED);

        await this.readFromRadio().catch((e) => {
          log(`IHTTPConnection`, e, LogRecord_Level.ERROR);
        });
      })
      .catch((e) => {
        log(`IHTTPConnection.writeToRadio`, e.message, LogRecord_Level.ERROR);
        this.onDeviceStatusEvent.next(
          Types.DeviceStatusEnum.DEVICE_RECONNECTING
        );
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
        this.onDeviceStatusEvent.next(Types.DeviceStatusEnum.DEVICE_RESTARTING);
      })
      .catch((e) => {
        log(`IHTTPConnection.restartDevice`, e.message, LogRecord_Level.ERROR);
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
      .catch((e) => {
        log(`IHTTPConnection.getStatistics`, e.message, LogRecord_Level.ERROR);
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
      .catch((e) => {
        log(`IHTTPConnection.getNetworks`, e.message, LogRecord_Level.ERROR);
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
      .catch((e) => {
        log(`IHTTPConnection.getSPIFFS`, e.message, LogRecord_Level.ERROR);
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
      })}`,
      {
        method: "DELETE"
      }
    )
      .then(async (response) => {
        return (await response.json()) as Types.WebSPIFFSResponse;
      })
      .catch((e) => {
        log(`IHTTPConnection.deleteSPIFFS`, e.message, LogRecord_Level.ERROR);
      });
  }

  /**
   * Web API method: Make device LED blink
   * @todo, strongly type response
   */
  public async blinkLED(): Promise<void | Response> {
    return fetch(`${this.url}/json/blink`, {
      method: "POST"
    }).catch((e) => {
      log(`IHTTPConnection.blinkLED`, e.message, LogRecord_Level.ERROR);
    });
  }
}
