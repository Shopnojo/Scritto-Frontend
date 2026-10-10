import type { ISODateTime } from "./api";

export interface MetricValue {
  value: number;
  /** Percentage change vs the previous period of equal length, if known. */
  change_pct?: number | null;
}

/**
 * GET /admin/analytics/overview
 *
 * "Installs" are anonymous app installations (the app has no login).
 * Active = sent at least one event in the period.
 */
export interface AnalyticsOverview {
  period_days: number;
  total_installs: MetricValue;
  active_installs: MetricValue;
  new_installs: MetricValue;
  events: MetricValue;
}

export interface TimeSeriesPoint {
  /** Calendar day, YYYY-MM-DD (UTC). */
  date: string;
  value: number;
}

export interface BreakdownItem {
  label: string;
  count: number;
}

/** GET /admin/analytics/installs */
export interface InstallAnalytics {
  period_days: number;
  daily_active: TimeSeriesPoint[];
  new_installs: TimeSeriesPoint[];
}

export interface ActivityEvent {
  id: string;
  name: string;
  installation_id: string;
  device_model?: string | null;
  app_version?: string | null;
  occurred_at: ISODateTime;
  /** Small, non-personal metadata, e.g. { "kind": "pdf" }. Never note content. */
  properties?: Record<string, string | number | boolean> | null;
}

/** GET /admin/analytics/events */
export interface EventAnalytics {
  period_days: number;
  daily: TimeSeriesPoint[];
  top_events: BreakdownItem[];
  recent: ActivityEvent[];
}

/** GET /admin/analytics/devices */
export interface DeviceAnalytics {
  os_versions: BreakdownItem[];
  models: BreakdownItem[];
}

/** GET /admin/analytics/versions */
export interface VersionAnalytics {
  latest_version?: string | null;
  versions: BreakdownItem[];
}
