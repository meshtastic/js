import { Subject } from "rxjs";

import { Protobuf, Types } from "./";
import { IMeshDevice } from "./imeshdevice";
import { log, typedArrayToBuffer } from "./utils";

/**
 * Allows to connect to a meshtastic device over HTTP(S)
 */
export class IHTTPConnection extends IMeshDevice {
  /**
   * URL of the device that is to be connected to.
   */
  url: string;

  /**
   * Enables receiving messages all at once, versus one per request
   */
  receiveBatchRequests: boolean;

  /**
   * Fires whenever a Fires at timed intervals
   * ? void or bool? ie. don't fire if device doesn't respond or true/false if it does/doesnt, or status code
   * @event
   */
  readonly onHeartbeatEvent: Subject<void> = new Subject();

  constructor() {
    super();

    this.url = undefined;
    this.consecutiveFailedRequests = 0;
  }

  /**
   * Initiates the connect process to a meshtastic device via HTTP(S)
   * @param address The IP Address/Domain to connect to, without protocol
   * @param tls Enables transport layer security. Notes: Slower, devices' certificate must be trusted by the browser
   * @param receiveBatchRequests Enables receiving messages all at once, versus one per request
   * @param fetchInterval Sets a fixed interval in that the device is fetched for new messages
   */
  async connect(
    address: string,
    tls?: boolean,
    receiveBatchRequests = false,
    fetchInterval?: number
  ) {
    this.onDeviceStatusEvent.next(Types.DeviceStatusEnum.DEVICE_CONNECTING);

    this.receiveBatchRequests = receiveBatchRequests;

    this.consecutiveFailedRequests = 0;

    if (!this.url) {
      /**
       * assemble url
       */
      this.url = tls ? `https://${address}` : `http://${address}`;
    }
    if (await this.ping()) {
      log(
        `IHTTPConnection.connect`,
        `Starting new request timer.`,
        Protobuf.LogLevelEnum.DEBUG
      );
      this.fetchTimer(fetchInterval);
    }
  }

  /**
   * Disconnects from the meshtastic device
   */
  disconnect() {
    this.onDisconnected();
  }

  /**
   * Pings device to check if it is avaliable
   */
  async ping() {
    log(
      `IHTTPConnection.connect`,
      `Attempting device ping.`,
      Protobuf.LogLevelEnum.DEBUG
    );

    let pingSuccessful = false;

    await fetch(this.url + `/hotspot-detect.html`, {})
      .then((_) => {
        pingSuccessful = true;
        this.onConnected();
      })
      .catch((e) => {
        pingSuccessful = false;
        this.consecutiveFailedRequests++;
        log(`IHTTPConnection.connect`, e.message, Protobuf.LogLevelEnum.ERROR);
        this.onDeviceStatusEvent.next(
          Types.DeviceStatusEnum.DEVICE_RECONNECTING
        );
      });
    return pingSuccessful;
  }

  /**
   * Short description
   */
  async readFromRadio() {
    let readBuffer = new ArrayBuffer(1);

    /**
     * read as long as the previous read buffer is bigger 0
     */
    while (readBuffer.byteLength > 0) {
      await fetch(
        this.url + `/api/v1/fromradio?all=${this.receiveBatchRequests ? 1 : 0}`,
        {
          method: "GET",
          headers: {
            Accept: "application/x-protobuf"
          }
        }
      )
        .then(async (response) => {
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
          /**
           * @todo does onDeviceTransationEvent need to be dispatched here too?
           * @todo exponential backoff here?
           * @todo do we need a failedRequests counter as we are going to broadcast device disconnected events
           * @todo if device is offline, it spam creates requests
           */
          this.consecutiveFailedRequests++;
          log(
            `IHTTPConnection.readFromRadio`,
            e.message,
            Protobuf.LogLevelEnum.ERROR
          );

          /**
           * @todo broadcast reconnecting event and then after x attempts, broadcast disconnected
           */

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
   * Short description
   */
  async writeToRadio(ToRadioUInt8Array: Uint8Array) {
    await fetch(`${this.url}/api/v1/toradio`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/x-protobuf"
      },
      body: typedArrayToBuffer(ToRadioUInt8Array)
    })
      .then(async (_) => {
        this.onDeviceStatusEvent.next(Types.DeviceStatusEnum.DEVICE_CONNECTED);

        await this.readFromRadio().catch((e) => {
          log(`IHTTPConnection`, e, Protobuf.LogLevelEnum.ERROR);
        });
      })
      .catch((e) => {
        this.consecutiveFailedRequests++;
        log(
          `IHTTPConnection.writeToRadio`,
          e.message,
          Protobuf.LogLevelEnum.ERROR
        );
        this.onDeviceStatusEvent.next(
          Types.DeviceStatusEnum.DEVICE_RECONNECTING
        );
      });
  }

  /**
   * Short description
   */
  private async fetchTimer(fetchInterval?: number) {
    /**
     * @todo change this behaviour, change to a more conservative retry rate
     */
    if (this.consecutiveFailedRequests > 3) {
      return this.disconnect();
    }

    await this.readFromRadio().catch((e) => {
      log(`IHTTPConnection`, e, Protobuf.LogLevelEnum.ERROR);
    });

    /**
     * Calculate new interval and set timeout again
     */
    let newInterval = 5e3;

    if (!fetchInterval) {
      newInterval =
        this.consecutiveFailedRequests > 2
          ? 12e4
          : this.consecutiveFailedRequests > 3
          ? 3e4
          : this.consecutiveFailedRequests > 4
          ? 2e4
          : this.consecutiveFailedRequests > 5
          ? 15e3
          : 1e4;
    } else {
      newInterval = fetchInterval;
    }

    setTimeout(this.fetchTimer.bind(this), newInterval);
  }

  /**
   * Web API method: Restart device
   */
  async restartDevice() {
    return fetch(`${this.url}/restart`, {
      method: "POST"
    })
      .then(() => {
        this.onDeviceStatusEvent.next(Types.DeviceStatusEnum.DEVICE_RESTARTING);
      })
      .catch((e) => {
        this.consecutiveFailedRequests++;
        log(
          `IHTTPConnection.restartDevice`,
          e.message,
          Protobuf.LogLevelEnum.ERROR
        );
      });
  }

  /**
   * Web API method: Get airtime statistics
   */
  async getStatistics() {
    return fetch(`${this.url}/json/report`, {
      method: "GET"
    })
      .then(async (response) => {
        return (await response.json()) as Types.WebStatisticsResponse;
      })
      .catch((e) => {
        this.consecutiveFailedRequests++;
        log(
          `IHTTPConnection.getStatistics`,
          e.message,
          Protobuf.LogLevelEnum.ERROR
        );
      });
  }

  /**
   * Web API method: Scan for WiFi AP's
   */
  async getNetworks() {
    return fetch(`${this.url}/json/scanNetworks`, {
      method: "GET"
    })
      .then(async (response) => {
        return (await response.json()) as Types.WebNetworkResponse;
      })
      .catch((e) => {
        this.consecutiveFailedRequests++;
        log(
          `IHTTPConnection.getNetworks`,
          e.message,
          Protobuf.LogLevelEnum.ERROR
        );
      });
  }

  /**
   * Web API method: Fetch SPIFFS contents
   */
  async getSPIFFS() {
    return fetch(`${this.url}/json/spiffs/browse/static`, {
      method: "GET"
    })
      .then(async (response) => {
        return (await response.json()) as Types.WebSPIFFSResponse;
      })
      .catch((e) => {
        this.consecutiveFailedRequests++;
        log(
          `IHTTPConnection.getSPIFFS`,
          e.message,
          Protobuf.LogLevelEnum.ERROR
        );
      });
  }

  /**
   * Web API method: Delete SPIFFS file
   */
  async deleteSPIFFS(file: string) {
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
        this.consecutiveFailedRequests++;
        log(
          `IHTTPConnection.deleteSPIFFS`,
          e.message,
          Protobuf.LogLevelEnum.ERROR
        );
      });
  }

  /**
   * Web API method: Make device LED blink
   * @todo, strongly type response
   */
  async blinkLED() {
    return fetch(`${this.url}/json/blink`, {
      method: "POST"
    }).catch((e) => {
      this.consecutiveFailedRequests++;
      log(`IHTTPConnection.blinkLED`, e.message, Protobuf.LogLevelEnum.ERROR);
    });
  }
}
