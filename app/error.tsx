"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/States";

/** Last-resort boundary for unexpected render errors. Never shows raw error text. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="glass w-full max-w-md rounded-card">
        <ErrorState error={null} title="Something went wrong" onRetry={reset} />
      </div>
    </main>
  );
}
