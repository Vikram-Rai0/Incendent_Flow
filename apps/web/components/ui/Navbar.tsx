// components/ui/Navbar.tsx
// Shown on every page after login
// Displays the app name, search, theme toggle, current user, and logout button

"use client";

import Link from "next/link";
import { Zap, Command, Bell, Plus, Wifi, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ui/Themetoggle";

function getInitials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function Navbar() {
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
  }

  return (
    <header className="sticky top-0 z-30 h-[70px] border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-full items-center gap-3 px-4 sm:px-5">
        {/* Left: logo */}
        <Link href="/incidents" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
            <Zap className="h-[18px] w-[18px] text-primary-foreground" fill="currentColor" />
          </span>
          <span className="font-display text-[17px] font-semibold tracking-tight text-foreground">
            IncidentFlow
          </span>
        </Link>

        {/* Center: search (visual only, as before) */}
        <div className="mx-auto hidden w-full max-w-[480px] md:block">

        </div>
        <div className="flex-1 md:hidden" />

        {/* Right: status, icons, theme, declare, user */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <span className="hidden items-center gap-1.5 rounded-lg border border-ok/30 bg-ok/10 px-2.5 py-1 text-xs font-medium text-ok lg:flex">
            <Wifi className="h-3.5 w-3.5" />
            Live
          </span>
          <button
            type="button"
            aria-label="Command menu"
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex"
          >
            <Command className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            aria-label="Notifications"
            className="relative hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex"
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
          </button>
          <ThemeToggle />

          <Link
            href="/incidents/new"
            className="flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:px-4"
          >
            <Plus className="h-4 w-4" />
            Declare
          </Link>

          {user && (
            <>
              <button
                onClick={handleLogout}
                className="hidden px-1 text-sm font-medium text-foreground transition-colors hover:text-muted-foreground sm:block"
              >
                Logout
              </button>
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary text-xs font-semibold text-foreground">
                {getInitials(user.name)}
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-ok" />
              </span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}