import type { ISODateTime, PageQuery } from "./api";

export type NotificationAudience = "all" | "devices";

export type NotificationStatus = "queued" | "sending" | "sent" | "partial" | "failed";

/** Body of POST /admin/notifications/send. The backend validates the audience. */
export interface SendNotificationRequest {
  title: string;
  body: string;
  audience: NotificationAudience;
  /** Installation IDs, when audience is "devices". */
  device_ids?: string[];
}

export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  audience: NotificationAudience;
  status: NotificationStatus;
  recipient_count?: number | null;
  success_count?: number | null;
  failure_count?: number | null;
  created_by?: string | null;
  created_at: ISODateTime;
  sent_at?: ISODateTime | null;
}

export type NotificationListQuery = PageQuery;
