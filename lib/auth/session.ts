/**
 * Short-lived browser session storage for the Supabase access token.
 * The backend remains the authority for every admin permission check.
 */
const TOKEN_KEY = "scritto.admin.token";
const REFRESH_TOKEN_KEY = "scritto.admin.refresh-token";
let memoryToken: string | null = null;

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage; } catch { return null; }
}

export function getAccessToken(): string | null {
  if (memoryToken) return memoryToken;
  try { memoryToken = storage()?.getItem(TOKEN_KEY) ?? null; } catch { memoryToken = null; }
  return memoryToken;
}

export function setAccessToken(token: string): void {
  memoryToken = token;
  try { storage()?.setItem(TOKEN_KEY, token); } catch { /* retain in memory */ }
}

export function getRefreshToken(): string | null {
  try { return storage()?.getItem(REFRESH_TOKEN_KEY) ?? null; } catch { return null; }
}

export function setAuthTokens(accessToken: string, refreshToken?: string): void {
  setAccessToken(accessToken);
  try {
    if (refreshToken) storage()?.setItem(REFRESH_TOKEN_KEY, refreshToken);
    else storage()?.removeItem(REFRESH_TOKEN_KEY);
  } catch { /* retain access token in memory */ }
}

export function clearAccessToken(): void {
  memoryToken = null;
  try {
    storage()?.removeItem(TOKEN_KEY);
    storage()?.removeItem(REFRESH_TOKEN_KEY);
  } catch { /* ignore unavailable storage */ }
}
