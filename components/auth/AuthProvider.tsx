"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as authApi from "@/lib/api/auth";
import { onUnauthorized } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { isAdmin } from "@/lib/auth/auth-utils";
import type { CurrentUser, LoginRequest } from "@/types/auth";

/**
 * - loading:         checking the session with GET /auth/me
 * - authenticated:   backend confirmed an admin
 * - forbidden:       signed in, but the backend says not an admin
 * - unauthenticated: no valid session
 * - error:           backend unreachable; we don't know yet
 */
export type AuthStatus = "loading" | "authenticated" | "forbidden" | "unauthenticated" | "error";

interface AuthContextValue {
  status: AuthStatus;
  user: CurrentUser | null;
  error: unknown;
  login: (credentials: LoginRequest) => Promise<AuthStatus>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthStatus>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<unknown>(undefined);
  const requestId = useRef(0);

  const refresh = useCallback(async (): Promise<AuthStatus> => {
    const id = ++requestId.current;
    setError(undefined);
    try {
      const me = await authApi.getCurrentUser();
      if (id !== requestId.current) return "loading";
      const next: AuthStatus = isAdmin(me) ? "authenticated" : "forbidden";
      setUser(me);
      setStatus(next);
      return next;
    } catch (err) {
      if (id !== requestId.current) return "loading";
      setUser(null);
      const next: AuthStatus = err instanceof ApiError && (err.isUnauthorized || err.isForbidden) ? "unauthenticated" : "error";
      if (next === "error") setError(err);
      setStatus(next);
      return next;
    }
  }, []);

  useEffect(() => {
    void refresh();
    // Any 401 from any API call means the session ended: drop to signed-out.
    return onUnauthorized(() => {
      requestId.current++;
      setUser(null);
      setStatus("unauthenticated");
    });
  }, [refresh]);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      await authApi.login(credentials);
      return refresh();
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    requestId.current++;
    await authApi.logout();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({ status, user, error, login, logout, refresh }),
    [status, user, error, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
