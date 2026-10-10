"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { loginUrlFor } from "@/lib/auth/auth-utils";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { FullScreenLoader } from "@/components/layout/FullScreenLoader";
import { useAuth } from "./AuthProvider";

/**
 * Client-side gate for admin pages. It only controls what renders: the real
 * enforcement is FastAPI rejecting non-admin tokens on every /admin/* call.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, user, error, logout, refresh } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === "unauthenticated") {
      const qs = searchParams.toString();
      router.replace(loginUrlFor(qs ? `${pathname}?${qs}` : pathname));
    }
  }, [status, pathname, searchParams, router]);

  if (status === "authenticated") return <>{children}</>;

  if (status === "forbidden") {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="glass w-full max-w-md rounded-card p-8 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl border border-danger/25 bg-danger-soft text-danger">
            <ShieldAlert className="size-6" />
          </div>
          <h1 className="text-lg font-semibold">No admin access</h1>
          <p className="mt-2 text-sm text-cream-faint">
            {user?.email ? <>You&apos;re signed in as <span className="text-cream-muted">{user.email}</span>, </> : "This account "}
            which doesn&apos;t have administrator permissions for Scritto.
          </p>
          <Button className="mt-6" onClick={() => void logout()}>
            Sign in with another account
          </Button>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="glass w-full max-w-md rounded-card">
          <ErrorState error={error} title="Couldn't verify your session" onRetry={() => void refresh()} />
        </div>
      </div>
    );
  }

  return <FullScreenLoader />;
}
