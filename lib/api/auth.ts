import type { CurrentUser, LoginRequest, LoginResponse } from "@/types/auth";
import { clearAccessToken, setAccessToken } from "@/lib/auth/session";
import { apiClient } from "./client";
import { ApiError } from "./errors";

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  try {
    const response = await apiClient.post<LoginResponse | undefined>("/auth/login", credentials);
    if (response?.access_token) setAccessToken(response.access_token);
    return response ?? {};
  } catch (error) {
    if (error instanceof ApiError && (error.status === 400 || error.status === 401)) {
      throw new ApiError(error.status, "Incorrect email or password.", error.debugDetail);
    }
    throw error;
  }
}

export function getCurrentUser(signal?: AbortSignal): Promise<CurrentUser> {
  return apiClient.get<CurrentUser>("/auth/me", { signal });
}

/** Ends the backend session. The local token is cleared even if the call fails. */
export async function logout(): Promise<void> {
  try {
    await apiClient.post<void>("/auth/logout");
  } catch {
    // The session may already be gone server-side; local cleanup still matters.
  } finally {
    clearAccessToken();
  }
}
