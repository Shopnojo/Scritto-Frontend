"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/States";
import { exchangeOAuthCode } from "@/lib/api/auth";
import { sanitizeNextPath } from "@/lib/auth/auth-utils";
import { useAuth } from "@/components/auth/AuthProvider";

const VERIFIER_KEY = "scritto.oauth.code-verifier";

function CallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useAuth();
  const [error, setError] = useState<unknown>(undefined);

  useEffect(() => {
    let cancelled = false;
    async function finish() {
      const code = params.get("code");
      const verifier = sessionStorage.getItem(VERIFIER_KEY);
      sessionStorage.removeItem(VERIFIER_KEY);
      if (!code || !verifier) {
        setError(new Error("The Google sign-in callback was incomplete. Please try again."));
        return;
      }

      try {
        await exchangeOAuthCode(code, verifier);
        const result = await refresh();
        if (cancelled) return;
        if (result === "authenticated") {
          router.replace(sanitizeNextPath(params.get("next")));
        } else if (result === "forbidden") {
          router.replace("/login?reason=unauthorized");
        } else if (result === "error") {
          setError(new Error("We couldn't verify administrator access. Check your connection and try again."));
        } else {
          setError(new Error("Your session could not be verified. Please try signing in again."));
        }
      } catch (err) {
        if (!cancelled) setError(err);
      }
    }
    void finish();
    return () => { cancelled = true; };
  }, [params, refresh, router]);

  if (error) {
    return (
      <div className="mt-6 space-y-4">
        <InlineError error={error} />
        <Button className="w-full" onClick={() => router.replace("/login")}>Back to sign in</Button>
      </div>
    );
  }

  return (
    <div className="mt-8 flex items-center justify-center gap-2 text-sm text-cream-faint" role="status">
      <LoaderCircle className="size-4 animate-spin" /> Verifying your administrator access…
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className="glass w-full max-w-sm rounded-card p-7 text-center">
        <h1 className="text-lg font-semibold">Signing you in</h1>
        <Suspense fallback={<p className="mt-6 text-sm text-cream-faint">Loading…</p>}>
          <CallbackContent />
        </Suspense>
      </div>
    </main>
  );
}
