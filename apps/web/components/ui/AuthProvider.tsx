// Wraps the entire app
// On every page load, tries to silently restore the session
// using the refresh token cookie from the backend

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { refreshSession } = useAuth();

  // "ready" means we've finished checking if the user has a valid session
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Try to get a new access token using the refresh cookie
    // This runs once when the app first loads
    refreshSession().finally(() => {
      setReady(true);
    });
  }, []);

  // While we're checking the session, show a simple loading screen
  // This prevents the UI from flashing between logged-out and logged-in states
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
