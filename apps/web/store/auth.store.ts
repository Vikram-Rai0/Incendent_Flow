// store/auth.store.ts
// This store holds the logged-in user's info and token
// Any component in the app can read from or write to this store

import { create } from "zustand";

// The shape of our auth state
interface AuthState {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  // Actions — functions that change the state
  setAuth: (user: AuthState["user"], accessToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Initial state — nobody is logged in yet
  user: null,
  accessToken: null,
  isAuthenticated: false,

  // Called after successful login
  // Saves the user and token, marks as authenticated
  setAuth: (user, accessToken) => {
    set({
      user,
      accessToken,
      isAuthenticated: true,
    });
  },

  // Called on logout
  // Wipes everything back to the initial state
  clearAuth: () => {
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  },
}));
