import { Subject } from "rxjs";
import { IMeshDevice } from "./imeshdevice";
import { LogLevelEnum } from "./protobuf";
import {
  ConnectionEventEnum,
  HTTPTransaction,
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
   * Short Description
   */
  url: string;

  /**
   * Whether or not tls (https) should be used for communtication to device
   */
  tls: boolean;

  /**
   * Short Description
   */
  fetchMode: "slow" | "balanced" | "fast" | "stream";

  /**
   * How often the device should be queried (ms)
   */
  fetchInterval: number;

  /**
   * Timestamp of last time device was interacted with
   */
  lastInteractionTime: number;

  /**
   * Current number of consecutive failed requests
   */
  consecutiveFailedRequests: number;

  /**
   * Enables receiving messages all at once, versus one per request
   */
  receiveBatchRequests: boolean;

  /**
   * Fires whenever a HTTP transaction is completed with the radio
   * @event
   */
  readonly onHTTPTransactionEvent: Subject<HTTPTransaction> = new Subject();

  /**
   * Fires whenever a Fires at timed intervals
   * ? void or bool? ie. don't fire if device doesn't respond or true/false if it does/doesnt, or status code
   * @event
   */
  readonly onHeartbeatEvent: Subject<void> = new Subject();

  constructor() {
    super();

    this.url = undefined;
    this.tls = undefined;
    this.fetchMode = undefined;
    this.fetchInterval = undefined;
    this.lastInteractionTime = undefined;
    this.consecutiveFailedRequests = 0;
  }

  /**
   * Initiates the connect process to a meshtastic device via HTTP(S)
   * @param address The IP Address/Domain to connect to, without protocol
   * @param tls Enables transport layer security. Notes: Slower, devices' certificate must be trusted by the browser
   * @param fetchMode Defines how new messages are fetched, takes 'slow', 'balanced', 'fast', 'stream'
   * @param fetchInterval Sets a fixed interval in that the device is fetched for new messages
   * @param fetchInterval [noAutoConfig=false] connect to the device without configuring it. Requires to call configure() manually
   * @param receiveBatchRequests Enables receiving messages all at once, versus one per request
   */
  async connect(
    address: string,
    tls?: boolean,
    noAutoConfig = false,
    receiveBatchRequests = false,
    fetchMode?: "slow" | "balanced" | "fast" | "stream",
    fetchInterval?: number
  ) {
    this.receiveBatchRequests = receiveBatchRequests;

    this.consecutiveFailedRequests = 0;

    if (!this.url) {
      /**
       * set the protocol
       */
      this.tls = !!tls;

      /**
       * assemble url
       */
      this.url = !!this.tls ? "https://" : "http://" + address;
    }

    log(
      `IHTTPConnection.connect`,
      `Attempting device ping.`,
      LogLevelEnum.DEBUG
    );

    fetch(this.url + `/hotspot-detect.html`, {})
      .then((response) => {
        this.onHTTPTransactionEvent.next({
          status: response.status,
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
      })
      .catch((e) => {
        this.consecutiveFailedRequests++;
        log(`IHTTPConnection.connect`, e.message, LogLevelEnum.ERROR);
      });

    /**
     * Implement reading from device config here: fetchMode and Interval
     */

    this.fetchMode = fetchMode;
    this.fetchInterval = fetchInterval;

    this.lastInteractionTime = Date.now();
    log(
      `IHTTPConnection.connect`,
      `Starting new connection timer.`,
      LogLevelEnum.TRACE
    );
    setTimeout(this.fetchTimer.bind(this), 5000);
  }

  /**
   * Disconnects from the meshtastic device
   */
  disconnect() {
    this.onDisconnected();
  }

  /**
   * Short description
   */
  async readFromRadio() {
    let readBuffer = new ArrayBuffer(1);

    /**
     * read as long as the previous read buffer is bigger 0
     * @todo, if `all=1` is set, don't do this
     */
    while (readBuffer.byteLength > 0) {
      await fetch(
        this.url + `/api/v1/fromradio?all=${this.receiveBatchRequests}`,
        {
          method: "GET",
          headers: {
            Accept: "application/x-protobuf",
          },
        }
      )
        .then(async (response) => {
          this.onHTTPTransactionEvent.next({
            status: response.status,
            interaction_time: Date.now(),
            consecutiveFailedRequests: this.consecutiveFailedRequests,
          });

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
          this.consecutiveFailedRequests++;
          log(`IHTTPConnection.readFromRadio`, e.message, LogLevelEnum.ERROR);
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
      .then((response) => {
        this.onHTTPTransactionEvent.next({
          status: response.status,
          interaction_time: Date.now(),
          consecutiveFailedRequests: this.consecutiveFailedRequests,
        });
      })
      .catch((e) => {
        this.consecutiveFailedRequests++;
        log(`IHTTPConnection.writeToRadio`, e.message, LogLevelEnum.ERROR);
      });
  }

  /**
   * Short description
   */
  private async fetchTimer() {
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

    if (!this.fetchInterval) {
      if (this.tls) {
        newInterval = 1e4;
      }
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
      newInterval = this.fetchInterval;
    }

    setTimeout(this.fetchTimer.bind(this), newInterval);
  }

  /**
   * Web API method: Restart device
   */
  async restartDevice() {
    return fetch(`${this.url}/restart`, {
      method: "POST",
    }).catch((e) => {
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
