/**
 * The only place that reads environment variables. Next.js inlines
 * NEXT_PUBLIC_* values at build time, so these must be referenced literally.
 * Never add non-public (secret) values here: this module ships to the browser.
 */

const DEFAULT_API_URL = "http://localhost:8000/api/v1";

export const env = {
  /** FastAPI base URL including /api/v1, without trailing slash. May be relative ("/api/v1"). */
  apiUrl: (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, ""),
  /** Serve API calls from lib/mocks instead of the network (UI development). */
  useMocks: process.env.NEXT_PUBLIC_USE_MOCKS === "true",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/+$/, "") ?? "",
  isProduction: process.env.NODE_ENV === "production",
} as const;
