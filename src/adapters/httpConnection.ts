import { MeshDevice } from "../meshDevice.ts";
import * as Types from "../types.ts";
import { typedArrayToBuffer } from "../utils/index.ts";

/** Allows to connect to a Meshtastic device over HTTP(S) */
export class HttpConnection extends MeshDevice {
  /** Defines the connection type as http */
  public connType: Types.ConnectionTypeName;

  /** URL of the device that is to be connected to. */
  protected portId: string;

  /** Enables receiving messages all at once, versus one per request */
  private receiveBatchRequests: boolean;

  private readLoop: ReturnType<typeof setInterval> | null;

  private pendingRequest: boolean;

  private abortController: AbortController;

  private readonly defaultRetryConfig: Types.HttpRetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffFactor: 2,
  };

  constructor(configId?: number) {
    super(configId);

    this.log = this.log.getSubLogger({ name: "HttpConnection" });

    this.connType = "http";
    this.portId = "";
    this.receiveBatchRequests = false;
    this.readLoop = null;
    this.pendingRequest = false;
    this.abortController = new AbortController();

    this.log.debug(
      Types.Emitter[Types.Emitter.Constructor],
      "🔷 HttpConnection instantiated",
    );
  }

  /**
   * Checks if the error should trigger a retry attempt
   * @param response - The fetch response
   * @returns boolean indicating if should retry
   */
  private shouldRetry(response: Response): boolean {
    if (response.status >= 500 && response.status <= 599) {
      return true;
    }

    if (!response.ok && response.status < 400) {
      return true;
    }

    return false;
  }

  /**
   * Implements exponential backoff retry logic for HTTP operations
   * @param operation - The async operation to retry
   * @param retryConfig - Configuration for retry behavior
   * @param operationName - Name of the operation for logging
   */
  private async withRetry(
    operation: () => Promise<Response>,
    retryConfig: Types.HttpRetryConfig,
    operationName: string,
  ): Promise<Response> {
    let delay = retryConfig.initialDelayMs;

    for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const response = await operation();

        // If the response is success or a non-retryable error, return it
        if (!this.shouldRetry(response)) {
          return response;
        }

        const error = new Error(
          `HTTP ${response.status}: ${response.statusText}`,
        );

        if (attempt === retryConfig.maxRetries) {
          throw error;
        }

        this.log.warn(
          `${operationName} failed (attempt ${attempt}/${retryConfig.maxRetries}): ${error.message}`,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(
          delay * retryConfig.backoffFactor,
          retryConfig.maxDelayMs,
        );
      } catch (error) {
        // If it's not a Response error (e.g., network error), don't retry
        if (!(error instanceof Error) || !error.message.startsWith("HTTP")) {
          throw error;
        }

        if (attempt === retryConfig.maxRetries) {
          throw error;
        }

        this.log.warn(
          `${operationName} failed (attempt ${attempt}/${retryConfig.maxRetries}): ${error.message}`,
        );
      }
    }

    // This line should never be reached due to the error handling above,
    throw new Error("Unexpected end of retry loop");
  }

  /**
   * Attempts a single connection to the device
   */
  private async attemptConnection(
    params: Types.HttpConnectionParameters,
  ): Promise<Response> {
    const { address, tls = false } = params;
    this.portId = `${tls ? "https://" : "http://"}${address}`;

    // We create a dummy request here just to have a Response object to work with
    // The actual connection check is done via ping()
    const response = await fetch(`${this.portId}/hotspot-detect.html`, {
      signal: this.abortController.signal,
      mode: "no-cors",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }

  /**
   * Initiates the connect process to a Meshtastic device via HTTP(S)
   */
  public async connect({
    address,
    fetchInterval = 3000,
    receiveBatchRequests = false,
    tls = false,
  }: Types.HttpConnectionParameters): Promise<void> {
    // Set initial state
    this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceConnecting);
    this.receiveBatchRequests = receiveBatchRequests;

    console.log("XXXXX Connecting to device");

    try {
      // Attempt connection with retries
      await this.withRetry(
        () => this.attemptConnection({ address, tls, fetchInterval }),
        {
          ...this.defaultRetryConfig,
          maxRetries: 5, // More retries for initial connection
          maxDelayMs: 10000, // Max 10s between retries
        },
        "Connect",
      );

      // If connection successful, set up device
      if (this.deviceStatus === Types.DeviceStatusEnum.DeviceConnecting) {
        this.log.debug(
          Types.Emitter[Types.Emitter.Connect],
          "Connection succeeded, starting configuration and request timer.",
        );

        // Start device configuration
        await this.configure().catch((error) => {
          this.log.warn(
            Types.Emitter[Types.Emitter.Connect],
            `Configuration warning: ${error.message}`,
          );
        });

        if (!this.readLoop) {
          this.readLoop = setInterval(async () => {
            try {
              await this.readFromRadio();
            } catch (error) {
              if (error instanceof Error) {
                this.log.error(
                  Types.Emitter[Types.Emitter.Connect],
                  `❌ Read loop error: ${error.message}`,
                );
              }
            }
          }, fetchInterval);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        this.log.error(
          Types.Emitter[Types.Emitter.Connect],
          `❌ Connection failed: ${error.message}`,
        );
      }

      // Only attempt reconnection if we haven't been disconnected
      if (this.deviceStatus !== Types.DeviceStatusEnum.DeviceDisconnected) {
        this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceReconnecting);

        this.connect({
          address,
          fetchInterval,
          receiveBatchRequests,
          tls,
        });
      }
    }
  }
  /** Disconnects from the Meshtastic device */
  public disconnect(): void {
    this.abortController.abort();
    this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceDisconnected);
    if (this.readLoop) {
      clearInterval(this.readLoop);
      this.complete();
    }
  }

  /** Pings device to check if it is available with retry logic */
  public async ping(): Promise<boolean> {
    this.log.debug(
      Types.Emitter[Types.Emitter.Ping],
      "Attempting device ping.",
    );

    const { signal } = this.abortController;

    try {
      const response = await this.withRetry(
        async () => {
          return await fetch(`${this.portId}/hotspot-detect.html`, {
            signal,
            mode: "no-cors",
          });
        },
        { ...this.defaultRetryConfig },
        "Ping",
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceConnected);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        this.log.error(
          Types.Emitter[Types.Emitter.Ping],
          `❌ ${error.message}`,
        );
      }
      this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceReconnecting);
      return false;
    }
  }

  /** Reads any avaliable protobuf messages from the radio */
  protected async readFromRadio(): Promise<void> {
    if (this.pendingRequest) {
      return;
    }
    let readBuffer = new ArrayBuffer(1);
    const { signal } = this.abortController;

    while (readBuffer.byteLength > 0) {
      this.pendingRequest = true;
      await fetch(
        `${this.portId}/api/v1/fromradio?all=${
          this.receiveBatchRequests ? "true" : "false"
        }`,
        {
          signal,
          method: "GET",
          headers: {
            Accept: "application/x-protobuf",
          },
        },
      )
        .then(async (response) => {
          this.pendingRequest = false;
          this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceConnected);

          readBuffer = await response.arrayBuffer();

          if (readBuffer.byteLength > 0) {
            this.handleFromRadio(new Uint8Array(readBuffer));
          }
        })
        .catch((e: Error) => {
          this.pendingRequest = false;
          this.log.error(
            Types.Emitter[Types.Emitter.ReadFromRadio],
            `❌ ${e.message}`,
          );

          this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceReconnecting);
        });
    }
  }

  /**
   * Sends supplied protobuf message to the radio
   */
  protected async writeToRadio(data: Uint8Array): Promise<void> {
    const { signal } = this.abortController;

    await fetch(`${this.portId}/api/v1/toradio`, {
      signal,
      method: "PUT",
      headers: {
        "Content-Type": "application/x-protobuf",
      },
      body: typedArrayToBuffer(data),
    })
      .then(async () => {
        this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceConnected);

        await this.readFromRadio().catch((e: Error) => {
          this.log.error(
            Types.Emitter[Types.Emitter.WriteToRadio],
            `❌ ${e.message}`,
          );
        });
      })
      .catch((e: Error) => {
        this.log.error(
          Types.Emitter[Types.Emitter.WriteToRadio],
          `❌ ${e.message}`,
        );
        this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceReconnecting);
      });
  }
}
