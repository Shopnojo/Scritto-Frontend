/**
 * Central HTTP client for the Scritto FastAPI backend.
 *
 * Every API call in the app goes through `apiRequest` (via the domain modules
 * in lib/api/*). Components never call fetch directly. That gives one place for:
 *   - the backend base URL (NEXT_PUBLIC_API_URL)
 *   - auth headers / cookies
 *   - timeouts
 *   - mapping errors to safe, user-facing messages
 *   - swapping in the mock backend during UI development
 */

import { env } from "@/lib/env";
import { clearAccessToken, getAccessToken } from "@/lib/auth/session";
import { ApiError, NETWORK_ERROR_STATUS, friendlyMessageForStatus } from "./errors";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  method?: HttpMethod;
  query?: QueryParams;
  body?: unknown;
  signal?: AbortSignal;
  /** Override the default timeout (ms). */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

/* ---------------------------------------------------------------- 401 hook */

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/** Subscribe to "session is no longer valid" (any 401). Returns an unsubscribe fn. */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

function notifyUnauthorized() {
  clearAccessToken();
  unauthorizedListeners.forEach((listener) => listener());
}

/* --------------------------------------------------------------- helpers */

export function buildQueryString(query?: QueryParams): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function buildUrl(path: string, query?: QueryParams): string {
  const normalisedPath = path.startsWith("/") ? path : `/${path}`;
  return `${env.apiUrl}${normalisedPath}${buildQueryString(query)}`;
}

function combineSignals(timeoutMs: number, external?: AbortSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("Timeout", "TimeoutError")), timeoutMs);
  const onExternalAbort = () => controller.abort(external?.reason);
  if (external) {
    if (external.aborted) controller.abort(external.reason);
    else external.addEventListener("abort", onExternalAbort, { once: true });
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      external?.removeEventListener("abort", onExternalAbort);
    },
  };
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

function logDebug(status: number, path: string, detail: unknown) {
  if (!env.isProduction) {
    console.warn(`[api] ${status} ${path}`, detail);
  }
}

/* ------------------------------------------------------------ main entry */

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", query, body, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const token = getAccessToken();

  // Read process.env literally (not env.useMocks) so the bundler can drop the
  // mock chunk entirely from builds where NEXT_PUBLIC_USE_MOCKS !== "true".
  if (process.env.NEXT_PUBLIC_USE_MOCKS === "true") {
    const { mockRequest } = await import("@/lib/mocks/server");
    try {
      return await mockRequest<T>({ method, path, query, body, token, signal });
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) notifyUnauthorized();
      throw error;
    }
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const { signal: requestSignal, cleanup } = combineSignals(timeoutMs, signal);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // Sends httpOnly session cookies when the backend uses cookie auth.
      // The backend's CORS config must list this origin explicitly with allow_credentials.
      credentials: "include",
      cache: "no-store",
      signal: requestSignal,
    });
  } catch (error) {
    cleanup();
    if (signal?.aborted) throw error; // caller cancelled: let it propagate untouched
    logDebug(NETWORK_ERROR_STATUS, path, error);
    throw new ApiError(NETWORK_ERROR_STATUS, friendlyMessageForStatus(NETWORK_ERROR_STATUS), error);
  }
  cleanup();

  const payload = await parseBody(response).catch(() => undefined);

  if (!response.ok) {
    logDebug(response.status, path, payload);
    if (response.status === 401) notifyUnauthorized();
    throw new ApiError(response.status, friendlyMessageForStatus(response.status), payload);
  }

  return payload as T;
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};
