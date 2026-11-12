// components/ui/Sidebar.tsx
// Left navigation for /incidents/* pages (desktop) + a tab strip for mobile.
// Presentation only - reads the current path and user, changes nothing.

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CircleAlert,
  ScrollText,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

function getInitials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function useActive() {
  const pathname = usePathname();

  return {
    dashboard: pathname === "/dashboard",
    incidents:
      pathname === "/incidents" ||
      pathname.startsWith("/incidents/"),
  };
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const active = useActive();

  const itemBase =
    "relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors";
  const activeCls = "bg-primary/10 text-primary";
  const idleCls = "text-muted-foreground hover:bg-accent hover:text-foreground";

  return (
    <aside
      className={`sticky top-[70px] hidden h-[calc(100vh-70px)] shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar p-3 transition-[width] duration-200 lg:flex ${
        collapsed ? "w-[68px]" : "w-[240px]"
      }`}
    >
      <div>
        {!collapsed && (
          <p className="label-xs mb-2 px-3 pt-2">Menu</p>
        )}
        <nav className="space-y-0.5">
          <Link
            href="/dashboard"
            aria-current={active.dashboard ? "page" : undefined}
            title={collapsed ? "Dashboard" : undefined}
            className={`${itemBase} ${active.dashboard ? activeCls : idleCls}`}
          >
            <LayoutDashboard className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && "Dashboard"}
          </Link>
          <Link
            href="/incidents"
            aria-current={active.incidents ? "page" : undefined}
            title={collapsed ? "Incidents" : undefined}
            className={`${itemBase} ${active.incidents ? activeCls : idleCls}`}
          >
            <CircleAlert className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && "Incidents"}
          </Link>
          {/* No audit-log route exists yet, so this is shown but not linked */}
          <span
            title={collapsed ? "Audit log" : undefined}
            className={`${itemBase} cursor-not-allowed text-muted-foreground opacity-50`}
          >
            <ScrollText className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && "Audit log"}
          </span>
        </nav>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-lg text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              Collapse
            </>
          )}
        </button>

        {user && (
          <div
            className={`flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 soft-shadow ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-xs font-semibold text-foreground">
              {getInitials(user.name)}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-ok" />
            </span>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.role}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

// Mobile / tablet: simple tab strip, since the sidebar is hidden below lg
export function MobileNav() {
  const active = useActive();
  const base = "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors";
  const on = "bg-primary/10 text-primary";
  const off = "text-muted-foreground hover:text-foreground";
  return (
    <nav className="flex gap-1 border-b border-border px-4 py-2 lg:hidden">
      <Link
        href="/dashboard"
        aria-current={active.dashboard ? "page" : undefined}
        className={`${base} ${active.dashboard ? on : off}`}
      >
        Dashboard
      </Link>
      <Link
        href="/incidents"
        aria-current={active.incidents ? "page" : undefined}
        className={`${base} ${active.incidents ? on : off}`}
      >
        Incidents
      </Link>
    </nav>
  );
}