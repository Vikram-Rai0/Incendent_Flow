import Link from "next/link";
import type { ReactNode } from "react";
import { Zap } from "lucide-react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  activeTab: "signin" | "signup";
  children: ReactNode;
}

function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Zap className={small ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden="true" />
      </span>
      <span className="text-[15px] font-semibold">IncidentFlow</span>
    </div>
  );
}

export default function AuthShell({
  title,
  subtitle,
  activeTab,
  children,
}: AuthShellProps) {
  const tabBase =
    "flex h-8 flex-1 items-center justify-center rounded-md text-sm font-medium text-foreground transition-colors";
  const tabActive = "bg-background";
  const tabIdle = "hover:bg-background/40";

  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-2">
      {/* Left branding panel */}
      <aside className="hidden flex-col justify-between border-r border-hairline bg-elevated p-10 lg:flex">
        <Logo />

        <div className="max-w-md">
          <h2 className="text-[30px] font-bold leading-[1.2] tracking-[-0.03em]">
            Calm coordination when production is on fire.
          </h2>

          <p className="mt-3 text-base leading-6 text-muted-foreground">
            Live responder presence, claimed tasks and a shared timeline — so
            everyone knows who is doing what.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Trusted by on-call teams shipping 24/7.
        </p>
      </aside>

      {/* Login and registration panel */}
      <main className="flex min-h-screen flex-col px-6 py-6 sm:px-10 lg:px-6 lg:py-0">
        <div className="lg:hidden">
          <Logo small />
        </div>

        <div className="flex flex-1 items-center justify-center py-8 lg:py-0">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold tracking-[-0.03em]">{title}</h1>

            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

            {/* Login and registration tabs */}
            <div className="mt-6 flex gap-0 rounded-lg border border-hairline bg-elevated p-1">
              <Link
                href="/login"
                aria-current={activeTab === "signin" ? "page" : undefined}
                className={`${tabBase} ${
                  activeTab === "signin" ? tabActive : tabIdle
                }`}
              >
                Sign in
              </Link>

              <Link
                href="/register"
                aria-current={activeTab === "signup" ? "page" : undefined}
                className={`${tabBase} ${
                  activeTab === "signup" ? tabActive : tabIdle
                }`}
              >
                Sign up
              </Link>
            </div>

            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25";

export const labelClass = "text-sm font-medium text-foreground";

export const primaryButtonClass =
  "h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";

export const errorBoxClass =
  "mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive";
