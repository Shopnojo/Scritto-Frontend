import type { ISODateTime } from "./api";

export type ConfigValue = string | number | boolean | Record<string, unknown> | unknown[] | null;

export interface ConfigEntry {
  key: string;
  value: ConfigValue;
  description?: string | null;
  updated_at?: ISODateTime | null;
}

/** GET /config */
export interface RemoteConfig {
  entries: ConfigEntry[];
  updated_at?: ISODateTime | null;
}

/** Body of PUT /config: only the keys being changed. */
export interface RemoteConfigUpdate {
  values: Record<string, ConfigValue>;
}
