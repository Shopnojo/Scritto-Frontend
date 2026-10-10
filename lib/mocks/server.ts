/**
 * In-browser mock of the FastAPI backend, enabled by NEXT_PUBLIC_USE_MOCKS=true.
 *
 * It implements the same paths, query params and response shapes as the real
 * API, so lib/api/* and every component behave identically against either.
 * To retire mocks: set NEXT_PUBLIC_USE_MOCKS=false (and delete this folder).
 */

import type { HttpMethod, QueryParams } from "@/lib/api/client";
import { ApiError, friendlyMessageForStatus } from "@/lib/api/errors";
import type { Paginated } from "@/types/api";
import type { AnalyticsOverview, MetricValue } from "@/types/analytics";
import type { RemoteConfigUpdate } from "@/types/config";
import type { SendNotificationRequest } from "@/types/notification";
import {
  DAY, LATEST_VERSION, NOW, breakdown, configEntries, devices, eventsForDevice, iso, newId,
  notifications, recentEvents, series, topEvents,
} from "./data";

interface MockRequest {
  method: HttpMethod;
  path: string;
  query?: QueryParams;
  body?: unknown;
  token: string | null;
  signal?: AbortSignal;
}

type Handler = (req: MockRequest, params: string[]) => unknown;

const MOCK_TOKEN_PREFIX = "mock-token-";

function fail(status: number): never {
  throw new ApiError(status, friendlyMessageForStatus(status), { mock: true });
}

function requireAuth(req: MockRequest) {
  if (!req.token?.startsWith(MOCK_TOKEN_PREFIX)) fail(401);
}

function paginate<T>(items: T[], query?: QueryParams): Paginated<T> {
  const page = Math.max(1, Number(query?.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query?.page_size) || 20));
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, page_size: pageSize };
}

function days(query?: QueryParams) {
  const d = Number(query?.days);
  return d === 7 || d === 90 ? d : 30;
}

function metric(value: number, change: number): MetricValue {
  return { value, change_pct: change };
}

const routes: [HttpMethod, RegExp, Handler][] = [
  /* ---------------------------------------------------------------- auth */
  ["POST", /^\/auth\/login$/, (req) => {
    const { email, password } = (req.body ?? {}) as { email?: string; password?: string };
    if (!email?.includes("@") || !password) fail(401);
    return { access_token: `${MOCK_TOKEN_PREFIX}${newId()}`, token_type: "bearer", expires_in: 3600 };
  }],
  ["GET", /^\/auth\/me$/, (req) => {
    requireAuth(req);
    return { id: "mock-admin", email: "admin@scritto.app", display_name: "Scritto Admin", role: "admin", is_admin: true };
  }],
  ["POST", /^\/auth\/logout$/, () => undefined],

  /* --------------------------------------------------------- installations */
  ["GET", /^\/admin\/devices$/, (req) => {
    requireAuth(req);
    const search = String(req.query?.search ?? "").trim().toLowerCase();
    const version = req.query?.app_version;
    const filtered = devices.filter(
      (d) =>
        (!version || d.app_version === version) &&
        (!search ||
          d.id.startsWith(search) ||
          `${d.manufacturer ?? ""} ${d.model ?? ""}`.toLowerCase().includes(search) ||
          (d.os_version ?? "").toLowerCase().includes(search)),
    );
    return paginate(filtered, req.query);
  }],
  ["GET", /^\/admin\/devices\/([^/]+)$/, (req, [id]) => {
    requireAuth(req);
    const device = devices.find((d) => d.id === id) ?? fail(404);
    const recent = eventsForDevice(device);
    return { ...device, recent_events: recent, top_events: breakdown(recent.map((e) => e.name)) };
  }],

  /* ----------------------------------------------------------- analytics */
  ["GET", /^\/admin\/analytics\/overview$/, (req): AnalyticsOverview => {
    requireAuth(req);
    const d = days(req.query);
    const cutoff = iso(NOW - d * DAY);
    const active = devices.filter((x) => x.last_seen_at && x.last_seen_at >= cutoff).length;
    const fresh = devices.filter((x) => x.created_at >= cutoff).length;
    return {
      period_days: d,
      total_installs: metric(devices.length, 6.4),
      active_installs: metric(active, 4.1),
      new_installs: metric(fresh, -2.3),
      events: metric(series(d, 620, 0.2, 47).reduce((s, p) => s + p.value, 0), 8.7),
    };
  }],
  ["GET", /^\/admin\/analytics\/installs$/, (req) => {
    requireAuth(req);
    const d = days(req.query);
    return { period_days: d, daily_active: series(d, 74, 0.18, 11), new_installs: series(d, 3, 0.1, 29) };
  }],
  ["GET", /^\/admin\/analytics\/events$/, (req) => {
    requireAuth(req);
    const d = days(req.query);
    const scale = d / 30;
    return {
      period_days: d,
      daily: series(d, 620, 0.2, 47),
      top_events: topEvents.map((e) => ({ ...e, count: Math.round(e.count * scale) })),
      recent: recentEvents,
    };
  }],
  ["GET", /^\/admin\/analytics\/devices$/, (req) => {
    requireAuth(req);
    return {
      os_versions: breakdown(devices.map((d) => d.os_version)),
      models: breakdown(devices.map((d) => d.model)).slice(0, 8),
    };
  }],
  ["GET", /^\/admin\/analytics\/versions$/, (req) => {
    requireAuth(req);
    return { latest_version: LATEST_VERSION, versions: breakdown(devices.map((d) => d.app_version)) };
  }],

  /* ------------------------------------------------------- notifications */
  ["POST", /^\/admin\/notifications\/send$/, (req) => {
    requireAuth(req);
    const body = (req.body ?? {}) as SendNotificationRequest;
    if (!body.title?.trim() || !body.body?.trim()) fail(422);
    if (body.audience === "devices" && !body.device_ids?.length) fail(422);
    const recipients = body.audience === "all" ? devices.length : body.device_ids!.length;
    const created = {
      id: newId(),
      title: body.title.trim(),
      body: body.body.trim(),
      audience: body.audience,
      status: "sent" as const,
      recipient_count: recipients,
      success_count: recipients,
      failure_count: 0,
      created_by: "admin",
      created_at: new Date().toISOString(),
      sent_at: new Date().toISOString(),
    };
    notifications.unshift(created);
    return created;
  }],
  ["GET", /^\/admin\/notifications$/, (req) => {
    requireAuth(req);
    return paginate(notifications, req.query);
  }],
  ["GET", /^\/admin\/notifications\/([^/]+)$/, (req, [id]) => {
    requireAuth(req);
    return notifications.find((n) => n.id === id) ?? fail(404);
  }],

  /* -------------------------------------------------------------- config */
  ["GET", /^\/config$/, () => ({
    entries: configEntries,
    updated_at: configEntries.map((e) => e.updated_at ?? "").sort().at(-1) ?? null,
  })],
  ["PUT", /^\/config$/, (req) => {
    requireAuth(req);
    const { values } = (req.body ?? {}) as RemoteConfigUpdate;
    if (!values || typeof values !== "object") fail(422);
    const now = new Date().toISOString();
    for (const [key, value] of Object.entries(values)) {
      const entry = configEntries.find((e) => e.key === key);
      if (!entry) fail(422);
      entry.value = value;
      entry.updated_at = now;
    }
    return { entries: configEntries, updated_at: now };
  }],
];

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

export async function mockRequest<T>(req: MockRequest): Promise<T> {
  await delay(250 + Math.random() * 350, req.signal);
  const path = req.path.split("?")[0];
  for (const [method, pattern, handler] of routes) {
    if (method !== req.method) continue;
    const match = pattern.exec(path);
    if (match) {
      // Clone so callers can't mutate mock state by reference.
      const result = handler(req, match.slice(1).map(decodeURIComponent));
      return (result === undefined ? undefined : structuredClone(result)) as T;
    }
  }
  return fail(404);
}
