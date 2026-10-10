import Link from "next/link";
import { Logo } from "@/components/layout/Logo";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <p className="text-5xl font-semibold tracking-tight text-accent">404</p>
        <p className="mt-3 text-sm text-cream-faint">This page doesn&apos;t exist.</p>
        <Link
          href="/dashboard"
          className="focus-ring mt-6 inline-flex h-10 items-center rounded-xl border border-line-strong bg-surface-3 px-4 text-sm font-medium text-cream hover:bg-line-strong/60"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
