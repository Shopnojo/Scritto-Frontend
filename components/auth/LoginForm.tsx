"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { InlineError } from "@/components/ui/States";
import { env } from "@/lib/env";
import { sanitizeNextPath } from "@/lib/auth/auth-utils";
import { useAuth } from "./AuthProvider";

export function LoginForm() {
  const { status, login, logout, user, error: sessionError } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = sanitizeNextPath(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(undefined);

  // Already signed in as an admin: skip the form.
  useEffect(() => {
    if (status === "authenticated") router.replace(nextPath);
  }, [status, nextPath, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(undefined);
    setSubmitting(true);
    try {
      const result = await login({ email: email.trim(), password });
      if (result === "authenticated") {
        router.replace(nextPath);
        return;
      }
      setSubmitting(false);
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
        <Button className="w-full" onClick={() => void logout()}>
          Use a different account
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@scritto.app"
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      <InlineError error={error ?? (status === "error" ? sessionError : undefined)} />

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        loading={submitting}
        disabled={!email.trim() || !password}
      >
        Sign in {!submitting && <ArrowRight className="size-4" />}
      </Button>

      {env.useMocks && (
        <p className="text-center text-xs text-cream-faint">Mock mode: any email and password will sign you in.</p>
      )}
    </form>
  );
}
