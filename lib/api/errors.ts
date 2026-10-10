/**
 * Normalised API error. `message` is always safe to show an administrator;
 * raw backend detail is kept on `debugDetail` for development logging only.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly debugDetail?: unknown;

  constructor(status: number, message: string, debugDetail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.debugDetail = debugDetail;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isNotFound() {
    return this.status === 404;
  }
}

/** Status 0 is used for network failures and timeouts (no HTTP response). */
export const NETWORK_ERROR_STATUS = 0;

export function friendlyMessageForStatus(status: number): string {
  if (status === NETWORK_ERROR_STATUS) {
    return "Can't reach the Scritto API. Check your connection and try again.";
  }
  switch (status) {
    case 400:
      return "The request couldn't be processed. Please review your input.";
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "You don't have permission to perform this action.";
    case 404:
      return "The requested item could not be found.";
    case 409:
      return "This change conflicts with the current state. Refresh and try again.";
    case 422:
      return "Some fields are invalid. Please review your input.";
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    default:
      return status >= 500
        ? "The server ran into a problem. Please try again shortly."
        : "Something went wrong. Please try again.";
  }
}

/** Safe, user-facing message for any thrown value. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Something went wrong. Please try again.";
}
