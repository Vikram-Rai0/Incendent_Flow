// hooks/useAuth.ts
// This hook gives any component access to auth actions
// login, logout, register, and refreshSession

"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { authApi } from "@/lib/api";

export function useAuth() {
  const router = useRouter();

  // Read state from the store
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  // Log the user in
  // Calls the API, saves the result to the store, redirects to incidents
  async function login(email: string, password: string) {
    const result = await authApi.login(email, password);
    setAuth(result.user, result.accessToken);
    router.push("/incidents");
  }

  // Register a new account then immediately log in
  async function register(email: string, password: string, name: string) {
    await authApi.register(email, password, name);
    const result = await authApi.login(email, password);
    setAuth(result.user, result.accessToken);
    router.push("/incidents");
  }

  // Log the user out
  // Calls the API (which clears the cookie), clears the store, redirects to login
  async function logout() {
    try {
      await authApi.logout();
    } catch {
      // Even if the API call fails, still clear local state
    }
    clearAuth();
    router.push("/login");
  }

  // Called on page load to silently restore the session
  // Uses the httpOnly refresh cookie — user never sees a login screen
  async function refreshSession(): Promise<boolean> {
    try {
      const result = await authApi.refresh();
      setAuth(result.user, result.accessToken);
      return true; // session restored
    } catch {
      clearAuth();
      return false; // no valid session, user needs to login
    }
  }

  return {
    user,
    accessToken,
    isAuthenticated,
    login,
    register,
    logout,
    refreshSession,
  };
}