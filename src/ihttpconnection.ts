import { Subject } from "rxjs";
import { IMeshDevice } from "./imeshdevice";
import { LogLevelEnum } from "./protobuf";
import {
  DeviceStatusEnum,
  WebNetworkResponse,
  WebSPIFFSResponse,
  WebStatisticsResponse,
} from "./types";
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
    this.lastInteractionTime = undefined;
    this.consecutiveFailedRequests = 0;
  }

  /**
   * Initiates the connect process to a meshtastic device via HTTP(S)
   * @param address The IP Address/Domain to connect to, without protocol
   * @param tls Enables transport layer security. Notes: Slower, devices' certificate must be trusted by the browser
   * @param noAutoConfig @todo rename this to make it clearer what it does, or maybe get rid of it. // [noAutoConfig=false] connect to the device without configuring it. Requires to call configure() manually
   * @param receiveBatchRequests Enables receiving messages all at once, versus one per request
   * @param fetchInterval Sets a fixed interval in that the device is fetched for new messages
   */
  async connect(
    address: string,
    tls?: boolean,
    noAutoConfig = false,
    receiveBatchRequests = false,
    fetchInterval?: number
  ) {
    log(
      `IHTTPConnection.connect`,
      "Sending onDeviceStatusEvent",
      LogLevelEnum.DEBUG,
      "DEVICE_CONNECTING"
    );
    this.onDeviceStatusEvent.next(DeviceStatusEnum.DEVICE_CONNECTING);

    this.receiveBatchRequests = receiveBatchRequests;

    this.consecutiveFailedRequests = 0;

    if (!this.url) {
      /**
       * assemble url
       */
      this.url = tls ? `https://${address}` : `http://${address}`;
    }

    log(
      `IHTTPConnection.connect`,
      `Attempting device ping.`,
      LogLevelEnum.DEBUG
    );

    fetch(this.url + `/hotspot-detect.html`, {})
      .then((response) => {
        log(
          `IHTTPConnection.connect`,
          "Sending onDeviceTransactionEvent",
          LogLevelEnum.TRACE,
          "success"
        );
        /**
         * @todo this isn't neccesairly a success, maybe change log to reflect this
         */
        this.onDeviceTransactionEvent.next({
          success: response.status === 200,
          interaction_time: Date.now(),
          consecutiveFailedRequests: this.consecutiveFailedRequests,
        });
        if (response.status === 200) {
          this.onConnected(noAutoConfig);
        } else {
          this.consecutiveFailedRequests++;
          log(
            `IHTTPConnection.connect`,
            `ping returned status: ${response.status}`,
            LogLevelEnum.WARNING
          );
        }
        log(
          `IHTTPConnection.connect`,
          `Starting new connection timer.`,
          LogLevelEnum.TRACE
        );
        setTimeout(() => {
          this.fetchTimer(fetchInterval);
        }, 5000);
      })
      .catch((e) => {
        this.consecutiveFailedRequests++;
        log(`IHTTPConnection.connect`, e.message, LogLevelEnum.ERROR);
        log(
          `IHTTPConnection.connect`,
          "Sending onDeviceTransactionEvent",
          LogLevelEnum.TRACE,
          "fail"
        );
        this.onDeviceTransactionEvent.next({
          success: false,
          interaction_time: Date.now(),
          consecutiveFailedRequests: this.consecutiveFailedRequests,
        });
      });
    this.lastInteractionTime = Date.now();
  }

  /**
   * Disconnects from the meshtastic device
   */
  disconnect() {
    this.onDisconnected();
  }

  /**
   * Pings device to check if it is avaliable
   * @todo implement
   */
  ping() {
    return true;
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
            Accept: "application/x-protobuf",
          },
        }
      )
        .then(async (response) => {
          log(
            `IHTTPConnection.readFromRadio`,
            "Sending onDeviceTransactionEvent",
            LogLevelEnum.TRACE,
            "success"
          );
          this.onDeviceTransactionEvent.next({
            success: response.status === 200,
            interaction_time: Date.now(),
            consecutiveFailedRequests: this.consecutiveFailedRequests,
          });

          if (this.deviceStatus < DeviceStatusEnum.DEVICE_CONNECTED) {
            log(
              `IHTTPConnection.readFromRadio`,
              "Sending onDeviceStatusEvent",
              LogLevelEnum.DEBUG,
              "DEVICE_CONNECTED"
            );
            this.onDeviceStatusEvent.next(DeviceStatusEnum.DEVICE_CONNECTED);
          }

          readBuffer = await response.arrayBuffer();

          log(
            `IHTTPConnection.readFromRadio`,
            `Received ${readBuffer.byteLength} bytes from radio.`,
            LogLevelEnum.TRACE
          );

          if (readBuffer.byteLength > 0) {
            this.lastInteractionTime = Date.now();
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
          log(`IHTTPConnection.readFromRadio`, e.message, LogLevelEnum.ERROR);

          /**
           * @todo broadcast reconnecting event and then after x attempts, broadcast disconnected
           */

          if (this.deviceStatus !== DeviceStatusEnum.DEVICE_RECONNECTING) {
            log(
              `IHTTPConnection.readFromRadio`,
              "Sending onDeviceStatusEvent",
              LogLevelEnum.DEBUG,
              "DEVICE_RECONNECTING"
            );
            this.onDeviceStatusEvent.next(DeviceStatusEnum.DEVICE_RECONNECTING);
          }
        });
    }
  }

  /**
   * Short description
   */
  async writeToRadio(ToRadioUInt8Array: Uint8Array) {
    this.lastInteractionTime = Date.now();

    fetch(`${this.url}/api/v1/toradio`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/x-protobuf",
      },
      body: typedArrayToBuffer(ToRadioUInt8Array),
    })
      .then(async (response) => {
        log(
          `IHTTPConnection.writeToRadio`,
          "Sending onDeviceTransactionEvent",
          LogLevelEnum.TRACE,
          "success"
        );
        this.onDeviceTransactionEvent.next({
          success: response.status === 200,
          interaction_time: Date.now(),
          consecutiveFailedRequests: this.consecutiveFailedRequests,
        });
        await this.readFromRadio().catch((e) => {
          log(`IHTTPConnection`, e, LogLevelEnum.ERROR);
        });
      })
      .catch((e) => {
        this.consecutiveFailedRequests++;
        log(`IHTTPConnection.writeToRadio`, e.message, LogLevelEnum.ERROR);
        /**
         * @todo these are not logged, they need to be caught, maybe even raise the log level, or not as devices should be able to go away and reconnect later
         */
        log(
          `IHTTPConnection.writeToRadio`,
          "Sending onDeviceTransactionEvent",
          LogLevelEnum.TRACE,
          "fail"
        );
        this.onDeviceTransactionEvent.next({
          success: false,
          interaction_time: Date.now(),
          consecutiveFailedRequests: this.consecutiveFailedRequests,
        });
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
      log(`IHTTPConnection`, e, LogLevelEnum.ERROR);
    });

    /**
     * Calculate new interval and set timeout again
     */
    let newInterval = 5e3;

    if (!fetchInterval) {
      const timeSinceLastInteraction = Date.now() - this.lastInteractionTime;
      newInterval =
        timeSinceLastInteraction > 12e5
          ? 12e4
          : timeSinceLastInteraction > 6e5
          ? 3e4
          : timeSinceLastInteraction > 18e4
          ? 2e4
          : timeSinceLastInteraction > 3e4
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
      method: "POST",
    })
      .then(() => {
        log(
          `IHTTPConnection.restartDevice`,
          "Sending onDeviceStatusEvent",
          LogLevelEnum.DEBUG,
          "DEVICE_RESTARTING"
        );
        this.onDeviceStatusEvent.next(DeviceStatusEnum.DEVICE_RESTARTING);
      })
      .catch((e) => {
        this.consecutiveFailedRequests++;
        log(`IHTTPConnection.restartDevice`, e.message, LogLevelEnum.ERROR);
      });
  }

  /**
   * Web API method: Get airtime statistics
   */
  async getStatistics() {
    return fetch(`${this.url}/json/report`, {
      method: "GET",
    })
      .then(async (response) => {
        return (await response.json()) as WebStatisticsResponse;
      })
      .catch((e) => {
        this.consecutiveFailedRequests++;
        log(`IHTTPConnection.getStatistics`, e.message, LogLevelEnum.ERROR);
      });
  }

  /**
   * Web API method: Scan for WiFi AP's
   */
  async getNetworks() {
    return fetch(`${this.url}/json/scanNetworks`, {
      method: "GET",
    })
      .then(async (response) => {
        return (await response.json()) as WebNetworkResponse;
      })
      .catch((e) => {
        this.consecutiveFailedRequests++;
        log(`IHTTPConnection.getNetworks`, e.message, LogLevelEnum.ERROR);
      });
  }

  /**
   * Web API method: Fetch SPIFFS contents
   */
  async getSPIFFS() {
    return fetch(`${this.url}/json/spiffs/browse/static`, {
      method: "GET",
    })
      .then(async (response) => {
        return (await response.json()) as WebSPIFFSResponse;
      })
      .catch((e) => {
        this.consecutiveFailedRequests++;
        log(`IHTTPConnection.getSPIFFS`, e.message, LogLevelEnum.ERROR);
      });
  }

  /**
   * Web API method: Delete SPIFFS file
   */
  async deleteSPIFFS(file: string) {
    return fetch(
      `${this.url}/json/spiffs/delete/static?${new URLSearchParams({
        delete: file,
      })}`,
      {
        method: "DELETE",
      }
    )
      .then(async (response) => {
        return (await response.json()) as WebSPIFFSResponse;
      })
      .catch((e) => {
        this.consecutiveFailedRequests++;
        log(`IHTTPConnection.deleteSPIFFS`, e.message, LogLevelEnum.ERROR);
      });
  }

  /**
   * Web API method: Make device LED blink
   */
  async blinkLED() {
    return fetch(`${this.url}/json/blink`, {
      method: "POST",
    }).catch((e) => {
      this.consecutiveFailedRequests++;
      log(`IHTTPConnection.blinkLED`, e.message, LogLevelEnum.ERROR);
    });
  }
}
