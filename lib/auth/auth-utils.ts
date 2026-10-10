import type { CurrentUser } from "@/types/auth";

/**
 * Reads the admin decision the backend already made in GET /auth/me.
 *
 * This only drives what the UI shows. It is NOT a security boundary: every
 * /admin/* endpoint must enforce the admin role itself and answer 403 otherwise.
 */
export function isAdmin(user: CurrentUser | null | undefined): boolean {
  if (!user) return false;
  if (typeof user.is_admin === "boolean") return user.is_admin;
  return user.role === "admin";
}

export const LOGIN_PATH = "/login";
export const DEFAULT_AUTHED_PATH = "/dashboard";

/**
 * Only allow redirects back to internal paths, so a crafted
 * `/login?next=https://evil.example` link can't bounce an admin off-site.
 */
export function sanitizeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return DEFAULT_AUTHED_PATH;
  }
  if (next === LOGIN_PATH || next.startsWith(`${LOGIN_PATH}?`)) return DEFAULT_AUTHED_PATH;
  return next;
}

export function loginUrlFor(currentPath: string): string {
  const next = sanitizeNextPath(currentPath);
  return next === DEFAULT_AUTHED_PATH
    ? LOGIN_PATH
    : `${LOGIN_PATH}?next=${encodeURIComponent(next)}`;
}
