// Wraps the whole app. On every page load it tries to restore the session
// from the refresh cookie, and holds the page back until it knows the answer.

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { refreshSession } = useAuth();

  // "ready" = we have finished checking whether there is a valid session
  const [ready, setReady] = useState(false);

  useEffect(() => {
    refreshSession().finally(() => setReady(true));
  }, []);

  // Without this wait, a logged-in user would flash the login redirect
  // for a moment on every reload.
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}