import type { MeshDevice } from "./../meshDevice.ts";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly log: MeshDevice,
  ) {
    super(`HTTP ${status}: ${statusText}`);

    this.name = "HttpError";
  }
}

/**
 * Type guard for Error instances
 * Narrows unknown error to Error type with message
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type guard for HTTP errors
 * Narrows unknown error to Error type with HTTP-specific message
 */
export function isHttpError(error: unknown): error is Error {
  return isError(error) && error.message.startsWith("HTTP");
}
