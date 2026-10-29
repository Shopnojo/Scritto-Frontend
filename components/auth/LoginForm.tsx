"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/States";
import { env } from "@/lib/env";
import { sanitizeNextPath } from "@/lib/auth/auth-utils";
import { useAuth } from "./AuthProvider";

const VERIFIER_KEY = "scritto.oauth.code-verifier";

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function startGoogleOAuth(nextPath: string): Promise<void> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
  }
  const random = crypto.getRandomValues(new Uint8Array(48));
  const verifier = base64Url(random);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = base64Url(new Uint8Array(digest));
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const callback = new URL(`${env.basePath}/auth/callback`, window.location.origin);
  callback.searchParams.set("next", nextPath);
  const authorize = new URL(`${env.supabaseUrl}/auth/v1/authorize`);
  authorize.searchParams.set("provider", "google");
  authorize.searchParams.set("redirect_to", callback.toString());
  authorize.searchParams.set("code_challenge", challenge);
  authorize.searchParams.set("code_challenge_method", "s256");
  authorize.searchParams.set("apikey", env.supabaseAnonKey);
  window.location.assign(authorize.toString());
}

export function LoginForm() {
  const { status, logout, user, error: sessionError } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = sanitizeNextPath(searchParams.get("next"));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(undefined);

  useEffect(() => {
    if (status === "authenticated") router.replace(nextPath);
  }, [status, nextPath, router]);

  const handleGoogleSignIn = async () => {
    setError(undefined);
    setSubmitting(true);
    try {
      await startGoogleOAuth(nextPath);
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  };

  if (status === "forbidden") {
    return (
      <div className="mt-6 space-y-4">
        <p className="rounded-xl border border-danger/25 bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">
          {user?.email ?? "This account"} doesn&apos;t have administrator access.
        </p>
        <Button className="w-full" onClick={() => void logout()}>Use a different account</Button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <InlineError error={error ?? (status === "error" ? sessionError : undefined)} />
      <Button
        type="button"
        variant="primary"
        className="w-full"
        loading={submitting || status === "loading"}
        disabled={submitting || status === "loading"}
        onClick={() => void handleGoogleSignIn()}
      >
        {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <GoogleMark />}
        Continue with Google {!submitting && <ArrowRight className="size-4" />}
      </Button>
      {env.useMocks && (
        <p className="text-center text-xs text-cream-faint">Mock mode does not bypass backend admin authorization.</p>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="currentColor">
      <path d="M21.6 12.23c0-.72-.06-1.42-.18-2.09H12v3.95h5.38a4.6 4.6 0 0 1-2 3.02v2.56h3.24c1.9-1.75 2.98-4.33 2.98-7.44ZM12 22c2.7 0 4.96-.9 6.62-2.43l-3.24-2.56c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.75-5.59-4.1H3.06v2.64A10 10 0 0 0 12 22ZM6.41 13.87A6.02 6.02 0 0 1 6.1 12c0-.65.11-1.28.31-1.87V7.49H3.06A10 10 0 0 0 2 12c0 1.62.39 3.15 1.06 4.51l3.35-2.64ZM12 6.03c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.58 9.58 0 0 0 12 2a10 10 0 0 0-8.94 5.49l3.35 2.64c.79-2.35 2.99-4.1 5.59-4.1Z" />
    </svg>
  );
}
