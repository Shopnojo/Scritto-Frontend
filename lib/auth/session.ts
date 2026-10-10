/**
 * Client-side storage for the backend-issued access token (bearer mode).
 *
 * sessionStorage keeps the token scoped to the tab and clears it when the tab
 * closes. If the backend switches to httpOnly cookie sessions, login simply
 * returns no token, nothing is stored here, and requests rely on the cookie.
 *
 * Holding a token in the browser never grants anything by itself: every admin
 * endpoint must re-verify the token and the admin role server-side.
 */

const TOKEN_KEY = "scritto.admin.token";

let memoryToken: string | null = null;

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    memoryToken = storage()?.getItem(TOKEN_KEY) ?? null;
  } catch {
    memoryToken = null;
  }
  return memoryToken;
}

export function setAccessToken(token: string): void {
  memoryToken = token;
  try {
    storage()?.setItem(TOKEN_KEY, token);
  } catch {
    // Storage unavailable (private mode, blocked): keep the in-memory copy.
  }
}

export function clearAccessToken(): void {
  memoryToken = null;
  try {
    storage()?.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}
