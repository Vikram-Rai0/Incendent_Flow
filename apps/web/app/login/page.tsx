// The login page — first thing a user sees if not authenticated

"use client"; // This page needs interactivity (form, state) so it must be a Client Component

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import AuthShell, {
  errorBoxClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "@/components/auth/authShell";

export default function LoginPage() {
  const { login } = useAuth();

  // Form field values
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false); // visual toggle only

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // prevent browser's default form submission
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      // login() handles the redirect to /incidents on success
    } catch (err) {
      // Show the error message from the API (e.g. "Invalid email or password")
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Sign in to your workspace"
      subtitle="Welcome back. Enter your details below."
      activeTab="signin"
    >
      {/* Error message */}
      {error && (
        <div role="alert" className={errorBoxClass}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-8">
        {/* Email field */}
        <div className="space-y-1">
          <label htmlFor="email" className={labelClass}>
            Work email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            required
            className={inputClass}
          />
        </div>

        {/* Password field */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            {/* No reset-password route exists yet, so this is a non-navigating placeholder */}
            <span className="cursor-default text-xs text-primary">
              Forgot password?
            </span>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className={`${inputClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className={`${primaryButtonClass} mt-0.5`}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {/* Link to register */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to IncidentFlow?{" "}
        <Link href="/register" className="text-primary hover:text-primary/80">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
