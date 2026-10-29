import type { CurrentUser } from "@/types/auth";
import { clearAccessToken, getRefreshToken, setAuthTokens } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { apiClient } from "./client";

export function getCurrentUser(signal?: AbortSignal): Promise<CurrentUser> {
  return apiClient.get<CurrentUser>("/auth/me", { signal });
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  try {
    if (env.supabaseUrl && env.supabaseAnonKey) {
      const headers: Record<string, string> = {
        apikey: env.supabaseAnonKey,
        "Content-Type": "application/json",
      };
      const accessToken = (await import("@/lib/auth/session")).getAccessToken();
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      await fetch(`${env.supabaseUrl}/auth/v1/logout`, {
        method: "POST",
        headers,
        body: refreshToken ? JSON.stringify({ refresh_token: refreshToken }) : undefined,
      });
    }
  } catch {
    // Local logout must still complete if the auth endpoint is unreachable.
  } finally {
    clearAccessToken();
  }
}

export async function exchangeOAuthCode(code: string, verifier: string): Promise<void> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("Supabase is not configured. Set the public Supabase URL and anon key.");
  }

  const response = await fetch(`${env.supabaseUrl}/auth/v1/token?grant_type=pkce`, {
    method: "POST",
    headers: {
      apikey: env.supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
  });

  const payload = await response.json().catch(() => ({})) as {
    access_token?: string;
    refresh_token?: string;
    msg?: string;
    message?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.message || payload.msg || "Google sign-in could not be completed. Please try again.");
  }

  setAuthTokens(payload.access_token, payload.refresh_token);
}
