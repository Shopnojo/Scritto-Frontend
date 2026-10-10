/**
 * Deterministic fake data for UI development (NEXT_PUBLIC_USE_MOCKS=true only).
 * Shapes follow /types exactly, i.e. what FastAPI is expected to return.
 * Nothing here is imported by components; only lib/mocks/server.ts uses it.
 */

import type { ActivityEvent, BreakdownItem, TimeSeriesPoint } from "@/types/analytics";
import type { ConfigEntry } from "@/types/config";
import type { Device } from "@/types/device";
import type { AdminNotification } from "@/types/notification";

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261010);
const pick = <T,>(items: readonly T[]) => items[Math.floor(rand() * items.length)];
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

const DAY = 86_400_000;
const NOW = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();
const uuid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(rand() * 16);
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });

const MODELS: [string, string][] = [
  ["Google", "Pixel 9"], ["Google", "Pixel 8a"], ["Samsung", "Galaxy S24"], ["Samsung", "Galaxy A55"],
  ["OnePlus", "OnePlus 12"], ["Nothing", "Phone (2)"], ["Xiaomi", "Redmi Note 13"], ["Motorola", "Moto G84"],
];
const OS_VERSIONS = ["Android 16", "Android 15", "Android 15", "Android 14", "Android 14", "Android 13", "Android 12"];
const LOCALES = ["en-IN", "en-US", "bn-IN", "hi-IN", "en-GB"];
export const APP_VERSIONS = ["1.5", "1.5", "1.5", "1.4", "1.4", "1.3"];
export const LATEST_VERSION = "1.5";

/** Event names the Android app is expected to send (see docs/android-integration.md). */
export const EVENT_NAMES = [
  "app_opened", "app_opened", "app_opened", "note_created", "note_created", "task_created",
  "task_completed", "event_scheduled", "document_opened", "ai_message_sent", "voice_assistant_used",
];

/* --------------------------------------------------------- installations */

export const devices: Device[] = Array.from({ length: 184 }, () => {
  const [manufacturer, model] = pick(MODELS);
  const createdAt = NOW - int(0, 120) * DAY - int(0, DAY);
  const lastSeen = rand() < 0.1 ? createdAt : Math.min(NOW, createdAt + int(0, (NOW - createdAt) / DAY) * DAY + int(0, DAY));
  return {
    id: uuid(),
    platform: "android",
    manufacturer,
    model,
    os_version: pick(OS_VERSIONS),
    app_version: pick(APP_VERSIONS),
    locale: pick(LOCALES),
    event_count: int(1, 900),
    created_at: iso(createdAt),
    last_seen_at: iso(Math.max(lastSeen, createdAt)),
  };
}).sort((a, b) => (b.last_seen_at ?? "").localeCompare(a.last_seen_at ?? ""));

/* ------------------------------------------------------------- analytics */

/** Smooth-ish daily series with weekly seasonality and gentle growth. */
export function series(days: number, base: number, growth: number, seed: number): TimeSeriesPoint[] {
  const r = mulberry32(seed + days);
  const out: TimeSeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(NOW - i * DAY);
    const weekday = date.getUTCDay();
    const weekly = weekday === 0 || weekday === 6 ? 0.82 : 1;
    const trend = 1 + growth * ((days - i) / days);
    const noise = 0.9 + r() * 0.2;
    out.push({ date: date.toISOString().slice(0, 10), value: Math.round(base * weekly * trend * noise) });
  }
  return out;
}

export function breakdown(values: (string | null | undefined)[]): BreakdownItem[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    const key = v ?? "Unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export const topEvents: BreakdownItem[] = [
  { label: "app_opened", count: 9840 },
  { label: "note_created", count: 3121 },
  { label: "ai_message_sent", count: 2410 },
  { label: "task_created", count: 1877 },
  { label: "task_completed", count: 1302 },
  { label: "document_opened", count: 988 },
  { label: "event_scheduled", count: 640 },
  { label: "voice_assistant_used", count: 377 },
];

function eventFor(device: Device, occurredAt: number): ActivityEvent {
  const name = pick(EVENT_NAMES);
  return {
    id: uuid(),
    name,
    installation_id: device.id,
    device_model: device.model,
    app_version: device.app_version,
    occurred_at: iso(occurredAt),
    properties: name === "document_opened" ? { kind: pick(["pdf", "docx", "xlsx", "image", "text"]) } : null,
  };
}

export const recentEvents: ActivityEvent[] = Array.from({ length: 12 }, (_, i) =>
  eventFor(devices[int(0, 30)], NOW - i * int(2, 9) * 60_000 - int(0, 50_000)),
).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

export function eventsForDevice(device: Device): ActivityEvent[] {
  const last = Date.parse(device.last_seen_at ?? device.created_at);
  return Array.from({ length: 10 }, (_, i) => eventFor(device, last - i * int(5, 240) * 60_000)).sort((a, b) =>
    b.occurred_at.localeCompare(a.occurred_at),
  );
}

/* --------------------------------------------------------- notifications */

export const notifications: AdminNotification[] = [
  {
    id: uuid(), title: "Scritto 1.5 is here", body: "A new document workspace and a smarter assistant. Update from the Play Store.",
    audience: "all", status: "sent", recipient_count: 162, success_count: 158, failure_count: 4,
    created_by: "admin", created_at: iso(NOW - 3 * DAY), sent_at: iso(NOW - 3 * DAY + 40_000),
  },
  {
    id: uuid(), title: "Test notification", body: "Checking delivery on a test device.",
    audience: "devices", status: "sent", recipient_count: 1, success_count: 1, failure_count: 0,
    created_by: "admin", created_at: iso(NOW - 9 * DAY), sent_at: iso(NOW - 9 * DAY + 5_000),
  },
];

export function newId() {
  return uuid();
}

/* ---------------------------------------------------------------- config */

export const configEntries: ConfigEntry[] = [
  { key: "maintenance_mode", value: false, description: "Shows a maintenance banner in the app.", updated_at: iso(NOW - 40 * DAY) },
  { key: "min_supported_version", value: "1.3", description: "Clients below this version are asked to update.", updated_at: iso(NOW - 12 * DAY) },
  { key: "latest_version", value: LATEST_VERSION, description: "Shown in the in-app update prompt.", updated_at: iso(NOW - 3 * DAY) },
  { key: "feature_ai_assistant", value: true, description: "Enables the Scritto AI assistant.", updated_at: iso(NOW - 8 * DAY) },
  { key: "telemetry_enabled", value: true, description: "Remote kill-switch for anonymous usage events.", updated_at: iso(NOW - 8 * DAY) },
  { key: "announcement", value: { enabled: false, message: "" }, description: "Optional in-app announcement card.", updated_at: iso(NOW - 20 * DAY) },
];

export { NOW, DAY, iso };
