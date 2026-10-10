"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { env } from "@/lib/env";
import { NAV_ITEMS, isActivePath } from "./nav";

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const section = NAV_ITEMS.find((item) => isActivePath(pathname, item.href))?.label ?? "Admin";

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await logout();
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-bg/70 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="focus-ring -ml-1 rounded-lg p-1.5 text-cream-muted hover:text-cream lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>

      <p className="text-sm font-medium text-cream-muted">{section}</p>

      <div className="ml-auto flex items-center gap-3">
        {env.useMocks && (
          <Badge tone="warning" dot className="hidden sm:inline-flex">
            Mock data
          </Badge>
        )}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="focus-ring flex items-center gap-2.5 rounded-xl py-1 pr-2 pl-1 transition hover:bg-surface-3/60"
          >
            <Avatar name={user?.display_name || user?.email} />
            <span className="hidden max-w-40 truncate text-left text-xs sm:block">
              <span className="block truncate font-medium text-cream">{user?.display_name || "Administrator"}</span>
              <span className="block truncate text-cream-faint">{user?.email}</span>
            </span>
          </button>
          {menuOpen && (
            <div role="menu" className="glass absolute right-0 mt-2 w-56 rounded-xl p-1.5 shadow-2xl">
              <div className="px-3 py-2 text-xs sm:hidden">
                <p className="truncate font-medium text-cream">{user?.display_name || "Administrator"}</p>
                <p className="truncate text-cream-faint">{user?.email}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                disabled={signingOut}
                className="focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-cream-muted transition hover:bg-surface-3 hover:text-cream disabled:opacity-50"
              >
                <LogOut className="size-4" />
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
