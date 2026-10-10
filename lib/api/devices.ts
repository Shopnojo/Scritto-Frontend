import type { Paginated } from "@/types/api";
import type { Device, DeviceDetail, DeviceListQuery } from "@/types/device";
import { apiClient } from "./client";

/** GET /admin/devices: paginated list of app installations. */
export function listDevices(query: DeviceListQuery = {}, signal?: AbortSignal) {
  return apiClient.get<Paginated<Device>>("/admin/devices", { query: { ...query }, signal });
}

/** GET /admin/devices/{id}: one installation with its recent activity. */
export function getDevice(deviceId: string, signal?: AbortSignal) {
  return apiClient.get<DeviceDetail>(`/admin/devices/${encodeURIComponent(deviceId)}`, { signal });
}
