"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils/cn";
import { Logo } from "./Logo";
import { NAV_ITEMS, isActivePath } from "./nav";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-surface/95 backdrop-blur-xl transition-transform",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Primary"
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/dashboard" className="focus-ring rounded-lg" onClick={onClose}>
            <Logo />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-lg p-1.5 text-cream-faint hover:text-cream lg:hidden"
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-ring group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-gradient-to-r from-accent-soft to-transparent text-cream"
                    : "text-cream-faint hover:bg-surface-3/60 hover:text-cream",
                )}
              >
                {active && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent" />}
                <Icon className={cn("size-4.5", active ? "text-accent" : "text-cream-faint group-hover:text-cream-muted")} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line px-5 py-4 text-[11px] text-cream-faint">
          {env.useMocks ? (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-warning" /> Mock data mode
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-success" /> Connected to API
            </span>
          )}
        </div>
      </aside>
    </>
  );
}
