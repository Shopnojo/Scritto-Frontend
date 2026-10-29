"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as authApi from "@/lib/api/auth";
import { onUnauthorized } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { clearAccessToken, getAccessToken } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/auth-utils";
import type { CurrentUser } from "@/types/auth";

export type AuthStatus = "loading" | "authenticated" | "forbidden" | "unauthenticated" | "error";

interface AuthContextValue {
  status: AuthStatus;
  user: CurrentUser | null;
  error: unknown;
  refresh: () => Promise<AuthStatus>;
  logout: () => Promise<void>;
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

    if (!getAccessToken()) {
      setUser(null);
      setStatus("unauthenticated");
      return "unauthenticated";
    }

    try {
      const me = await authApi.getCurrentUser();
      if (id !== requestId.current) return "loading";
      setUser(me);
      const next: AuthStatus = isAdmin(me) ? "authenticated" : "forbidden";
      setStatus(next);
      return next;
    } catch (err) {
      if (id !== requestId.current) return "loading";
      setUser(null);
      if (err instanceof ApiError && err.isUnauthorized) {
        clearAccessToken();
        setStatus("unauthenticated");
        return "unauthenticated";
      }
      if (err instanceof ApiError && err.isForbidden) {
        setStatus("forbidden");
        return "forbidden";
      }
      setError(err);
      setStatus("error");
      return "error";
    }
  }, []);

  useEffect(() => {
    void refresh();
    return onUnauthorized(() => {
      requestId.current++;
      setUser(null);
      setStatus("unauthenticated");
    });
  }, [refresh]);

  const logout = useCallback(async () => {
    requestId.current++;
    await authApi.logout();
    setUser(null);
    setError(undefined);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(() => ({ status, user, error, refresh, logout }), [status, user, error, refresh, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
