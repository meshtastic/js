import { SettingsManager } from "./settingsmanager";
import { IMeshDevice } from "./imeshdevice";
import { typedArrayToBuffer } from "./utils";

/**
 * Allows to connect to a meshtastic device over HTTP(S)
 */
export class IHTTPConnection extends IMeshDevice {
  /**
   * Short Description
   */
  url: string;

  /**
   * Short Description
   */
  tls: boolean;

  /**
   * Short Description
   */
  fetchMode: string;

  /**
   * Short Description
   */
  fetchInterval: number;

  /**
   * Short Description
   */
  lastInteractionTime: number;

  /**
   * Short Description
   */
  consecutiveFailedRequests: number;

  /**
   * Short Description
   */
  isConnected: boolean;

  /**
   * Short Description
   */
  receiveBatchRequests: boolean;

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
   */
  async connect(
    address: string,
    tls: boolean = undefined,
    fetchMode: string = undefined,
    fetchInterval: number = undefined,
    noAutoConfig = false,
    receiveBatchRequests = false
  ) {
    this.receiveBatchRequests = receiveBatchRequests;

    if (this.isConnected === true) {
      throw new Error(
        "Error in meshtasticjs.IHTTPConnection.connect: Device is already connected"
      );
    }

    this.consecutiveFailedRequests = 0;

    if (this.url !== undefined && address === undefined && tls === undefined) {
      // Do nothing as url has already been set in previous connect
      // and no new params have been given
    } else {
      // Set the address
      if (address === undefined) {
        throw new Error(
          "Error in meshtasticjs.IBLEConnection.connect: Please specify connect address"
        );
      }

      // set the protocol
      this.tls = !!tls;

      // assemble url
      this.url = !!this.tls ? "https://" : "http://" + address;
    }

    // At this point device is (presumably) connected, maybe check with ping-like request first
    this.isConnected = true;

    await this.onConnected(noAutoConfig);

    // Implement reading from device config here: fetchMode and Interval

    this.fetchMode = fetchMode;
    this.fetchInterval = fetchInterval;

    this.lastInteractionTime = Date.now();
    setTimeout(this.fetchTimer.bind(this), 5000);
  }

  /**
   * Disconnects from the meshtastic device
   */
  disconnect() {
    if (this.isConnected === false) {
      if (SettingsManager.debugMode) {
        console.log(
          "meshtasticjs.IHTTPConnection.disconnect: device already disconnected"
        );
      }
    }

    this.onDisconnected();
  }

  /**
   * Short description
   */
  async readFromRadio() {
    let readBuffer = new ArrayBuffer(1);

    // read as long as the previous read buffer is bigger 0
    while (readBuffer.byteLength > 0) {
      try {
        readBuffer = await this.httpRequest(
          this.url + "/api/v1/fromradio?all=" + this.receiveBatchRequests,
          "GET"
        );

        if (readBuffer.byteLength > 0) {
          this.lastInteractionTime = Date.now();
          await this.handleFromRadio(new Uint8Array(readBuffer, 0));
        }
      } catch (e) {
        this.consecutiveFailedRequests++;
        throw new Error(
          "Error in meshtasticjs.IHTTPConnection.readFromRadio: " + e.message
        );
      }
    }
  }

  /**
   * Short description
   */
  async writeToRadio(ToRadioUInt8Array: Uint8Array) {
    this.lastInteractionTime = Date.now();

    try {
      await this.httpRequest(
        this.url + "/api/v1/fromradio",
        "PUT",
        typedArrayToBuffer(ToRadioUInt8Array)
      );
    } catch (e) {
      this.consecutiveFailedRequests++;
      throw new Error(
        "Error in meshtasticjs.IHTTPConnection.writeToRadio: " + e.message
      );
    }
  }

  /**
   * Short description
   */
  private async httpRequest(
    url: string,
    type = "GET",
    toRadioBuffer: ArrayBuffer = undefined
  ) {
    let response: Response;

    switch (type) {
      case "GET":
        // cant use mode: no-cors here, because browser then obscures if request was successful
        response = await fetch(url, {
          method: "GET",
        });

        break;
      case "PUT":
        response = await fetch(this.url + "/api/v1/toradio", {
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

    if (response.status === 200) {
      // Response is a ReadableStream
      return response.arrayBuffer();
    } else {
      throw new Error(
        "HTTP request failed with status code " + response.status
      );
    }
  }

  /**
   * Short description
   */
  private async fetchTimer() {
    if (this.consecutiveFailedRequests > 3) {
      if (this.isConnected === true) {
        this.disconnect();
      }
      return;
    }

    try {
      await this.readFromRadio();
    } catch (e) {
      if (SettingsManager.debugMode) {
        console.log(e);
      }
    }

    // Calculate new interval and set timeout again
    let newInterval = 5000;

    if (this.fetchInterval === undefined) {
      // Interval fetch profile 1

      if (this.tls === true) {
        newInterval = 10000;
      }
      let timeSinceLastInteraction = Date.now() - this.lastInteractionTime;
      if (timeSinceLastInteraction > 1200000) {
        // If no action in 20 mins
        newInterval = 120000;
      } else if (timeSinceLastInteraction > 600000) {
        // If no action in 10 mins
        newInterval = 30000;
      } else if (timeSinceLastInteraction > 180000) {
        // If no action in 3 mins
        newInterval = 20000;
      } else if (timeSinceLastInteraction > 30000) {
        // If no action in 30 secs
        newInterval = 15000;
      }
    } else {
      newInterval = this.fetchInterval;
    }

    setTimeout(this.fetchTimer.bind(this), newInterval);
  }
}
