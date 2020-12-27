import { Subject } from "rxjs";
import { IMeshDevice } from "./imeshdevice";
import { DebugLevelEnum } from "./settingsmanager";
import { debugLog, typedArrayToBuffer } from "./utils";

interface HTTPTransaction {
  status: number;
  interaction_time: Number;
  consecutiveFailedRequests?: number;
}

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
   * States if the current device is currently connected or not
   */
  isConnected: boolean;

  /**
   * Enables receiving messages all at once, versus one per request
   */
  receiveBatchRequests: boolean;

  /**
   * Fires whenever a HTTP transaction is completed with the radio
   * @event
   */
  readonly onHTTPTransactionEvent: Subject<HTTPTransaction> = new Subject();

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

    if (this.isConnected) {
      throw new Error(
        "Error in meshtasticjs.IHTTPConnection.connect: Device is already connected"
      );
    }

    this.consecutiveFailedRequests = 0;

    if (!this.url && !address && !tls) {
      /**
       * Do nothing as url has already been set in previous connect and no new params have been given
       */
    } else {
      /**
       * Set the address
       */
      if (!address) {
        throw new Error(
          "Error in meshtasticjs.IBLEConnection.connect: Please specify connect address"
        );
      }

      /**
       * set the protocol
       */
      this.tls = !!tls;

      /**
       * assemble url
       */
      this.url = !!this.tls ? "https://" : "http://" + address;
    }

    /**
     * At this point device is (presumably) connected, maybe check with ping-like request first
     * @todo use ping endpoint
     */
    this.isConnected = true;
    debugLog(
      `meshtasticjs.IHTTPConnection.connect: URL set to: ${this.url}`,
      DebugLevelEnum.DEBUG
    );

    this.onHTTPTransactionEvent.next({
      status: 200,
      interaction_time: Date.now(),
      consecutiveFailedRequests: this.consecutiveFailedRequests,
    });

    await this.onConnected(noAutoConfig);

    /**
     * Implement reading from device config here: fetchMode and Interval
     */

    this.fetchMode = fetchMode;
    this.fetchInterval = fetchInterval;

    this.lastInteractionTime = Date.now();
    debugLog(
      "meshtasticjs.IHTTPConnection.connect:  starting timer",
      DebugLevelEnum.DEBUG
    );
    setTimeout(this.fetchTimer.bind(this), 5000);
  }

  /**
   * Disconnects from the meshtastic device
   */
  disconnect() {
    if (!this.isConnected) {
      debugLog(
        "meshtasticjs.IHTTPConnection.disconnect: device already disconnected",
        DebugLevelEnum.DEBUG
      );
    }
    this.onHTTPTransactionEvent.next({
      status: 503,
      interaction_time: Date.now(),
      consecutiveFailedRequests: this.consecutiveFailedRequests,
    });

    this.onDisconnected();
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
      try {
        readBuffer = await this.httpRequest(
          this.url + `/api/v1/fromradio?all=${this.receiveBatchRequests}`,
          "GET"
        );

        debugLog(
          `meshtasticjs.IHTTPConnection.readFromRadio: received ${readBuffer.byteLength} bytes from radio`,
          DebugLevelEnum.DEBUG
        );

        if (readBuffer.byteLength > 0) {
          this.lastInteractionTime = Date.now();
          await this.handleFromRadio(new Uint8Array(readBuffer, 0));
        }
      } catch (e) {
        this.consecutiveFailedRequests++;
        throw new Error(
          `Error in meshtasticjs.IHTTPConnection.readFromRadio: ${e.message}`
        );
      }
    }
  }

  /**
   * Short description
   */
  async writeToRadio(ToRadioUInt8Array: Uint8Array) {
    this.lastInteractionTime = Date.now();

    await this.httpRequest(
      `${this.url}/api/v1/fromradio`,
      "PUT",
      typedArrayToBuffer(ToRadioUInt8Array)
    ).catch((e) => {
      this.consecutiveFailedRequests++;
      throw new Error(
        `Error in meshtasticjs.IHTTPConnection.writeToRadio: ${e.message}`
      );
    });
  }

  /**
   * Short description
   */
  private async httpRequest(
    url: string,
    type = "GET",
    toRadioBuffer?: ArrayBuffer
  ) {
    let response: Response;

    switch (type) {
      case "GET":
        /**
         * cant use mode: no-cors here, because browser then obscures if request was successful
         */
        response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/x-protobuf",
          },
        });

        break;
      case "PUT":
        response = await fetch(`${this.url}/api/v1/toradio`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/x-protobuf",
          },
          body: toRadioBuffer,
        });

        break;
      default:
        break;
    }

    this.onHTTPTransactionEvent.next({
      status: response.status,
      interaction_time: Date.now(),
      consecutiveFailedRequests: this.consecutiveFailedRequests,
    });

    if (response.status === 200) {
      return response.arrayBuffer();
    } else {
      throw new Error(
        `HTTP request failed with status code ${response.status}`
      );
    }
  }

  /**
   * Short description
   */
  private async fetchTimer() {
    if (this.consecutiveFailedRequests > 3) {
      if (this.isConnected) {
        this.disconnect();
      }
      return;
    }

    await this.readFromRadio().catch((e) => {
      debugLog(e, DebugLevelEnum.ERROR);
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
}
