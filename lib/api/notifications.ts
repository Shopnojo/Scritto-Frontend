import type { Paginated } from "@/types/api";
import type {
  AdminNotification,
  NotificationListQuery,
  SendNotificationRequest,
} from "@/types/notification";
import { apiClient } from "./client";

const BASE = "/admin/notifications";

export function sendNotification(request: SendNotificationRequest) {
  return apiClient.post<AdminNotification>(`${BASE}/send`, request);
}

export function listNotifications(query: NotificationListQuery = {}, signal?: AbortSignal) {
  return apiClient.get<Paginated<AdminNotification>>(BASE, { query: { ...query }, signal });
}

export function getNotification(id: string, signal?: AbortSignal) {
  return apiClient.get<AdminNotification>(`${BASE}/${encodeURIComponent(id)}`, { signal });
}
