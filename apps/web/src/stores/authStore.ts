import { User as FirebaseUser } from 'firebase/auth';
import { create } from 'zustand';

import * as firebase from '@/lib/firebase';

/**
 * Helper to set auth cookie
 * Used to indicate authenticated state for middleware
 */
function setAuthCookie() {
  // Set a simple auth flag cookie for middleware to check
  // Use a 7-day expiration
  const expiresDate = new Date();
  expiresDate.setDate(expiresDate.getDate() + 7);
  document.cookie = `auth-token=authenticated; path=/; expires=${expiresDate.toUTCString()}; SameSite=Lax`;
}

/**
 * Helper to clear auth cookie
 */
function clearAuthCookie() {
  document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax';
}

/**
 * Auth store state and actions
 */
export interface AuthState {
  // State
  user: FirebaseUser | null;
  loading: boolean;
  error: string | null;

  // Actions
  setUser: (user: FirebaseUser | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  signIn: (email: string, password: string) => Promise<FirebaseUser>;
  signUp: (email: string, password: string) => Promise<FirebaseUser>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

/**
 * Zustand auth store
 *
 * Manages:
 * - Current user state
 * - Loading states
 * - Error states
 * - Sign in/up/out operations
 */
export const useAuthStore = create<AuthState>((set) => ({
  // Initial state
  user: null,
  loading: true,
  error: null,

  // State setters
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const user = await firebase.signIn(email, password);
      setAuthCookie();
      set({ user, loading: false });
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Sign up with email and password
  signUp: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const user = await firebase.signUp(email, password);
      setAuthCookie();
      set({ user, loading: false });
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Sign out current user
  signOut: async () => {
    set({ loading: true, error: null });
    try {
      await firebase.signOut();
      clearAuthCookie();
      set({ user: null, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },
}));

/**
 * Initialize auth state by subscribing to Firebase auth state changes
 * Call this once in your app's root provider
 *
 * Also manages auth cookies for middleware to check authentication state
 */
export function initializeAuth() {
  const unsubscribe = firebase.onAuthStateChange((user) => {
    useAuthStore.setState({ user, loading: false });

    // Update auth cookie when Firebase auth state changes
    if (user) {
      setAuthCookie();
    } else {
      clearAuthCookie();
    }
  });

  return unsubscribe;
}
