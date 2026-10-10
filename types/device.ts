import type { ISODateTime, PageQuery } from "./api";
import type { ActivityEvent, BreakdownItem } from "./analytics";

/**
 * One anonymous installation of the Scritto app. The app has no user
 * accounts: `id` is the random installation ID the app generates on first
 * launch and sends to POST /devices/register.
 */
export interface Device {
  id: string;
  platform: string;
  manufacturer?: string | null;
  model?: string | null;
  os_version?: string | null;
  app_version?: string | null;
  locale?: string | null;
  event_count?: number | null;
  /** First registration (first launch with telemetry). */
  created_at: ISODateTime;
  last_seen_at?: ISODateTime | null;
}

/** GET /admin/devices/{id} */
export interface DeviceDetail extends Device {
  recent_events: ActivityEvent[];
  top_events: BreakdownItem[];
}

export interface DeviceListQuery extends PageQuery {
  search?: string;
  app_version?: string;
}
