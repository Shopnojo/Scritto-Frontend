import type { RemoteConfig, RemoteConfigUpdate } from "@/types/config";
import { apiClient } from "./client";

export function getRemoteConfig(signal?: AbortSignal) {
  return apiClient.get<RemoteConfig>("/config", { signal });
}

/**
 * PUT /config: the backend must restrict writes to admins. Reads stay
 * public because the Android app fetches the same document.
 */
export function updateRemoteConfig(update: RemoteConfigUpdate) {
  return apiClient.put<RemoteConfig>("/config", update);
}
