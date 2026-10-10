import type { AnalyticsPeriod } from "@/types/api";
import type {
  AnalyticsOverview,
  DeviceAnalytics,
  EventAnalytics,
  InstallAnalytics,
  VersionAnalytics,
} from "@/types/analytics";
import { apiClient } from "./client";

const BASE = "/admin/analytics";

export function getOverview(days: AnalyticsPeriod, signal?: AbortSignal) {
  return apiClient.get<AnalyticsOverview>(`${BASE}/overview`, { query: { days }, signal });
}

export function getInstallAnalytics(days: AnalyticsPeriod, signal?: AbortSignal) {
  return apiClient.get<InstallAnalytics>(`${BASE}/installs`, { query: { days }, signal });
}

export function getEventAnalytics(days: AnalyticsPeriod, signal?: AbortSignal) {
  return apiClient.get<EventAnalytics>(`${BASE}/events`, { query: { days }, signal });
}

export function getDeviceAnalytics(signal?: AbortSignal) {
  return apiClient.get<DeviceAnalytics>(`${BASE}/devices`, { signal });
}

export function getVersionAnalytics(signal?: AbortSignal) {
  return apiClient.get<VersionAnalytics>(`${BASE}/versions`, { signal });
}
