'use client';

import { ReactNode, useEffect, useRef, createContext } from 'react';

import { apiClient } from '@/lib/api';
import * as firebase from '@/lib/firebase';
import { useAuthStore, initializeAuth } from '@/stores/authStore';

/**
 * Auth Context type for accessing auth state
 * Exported for consumers who prefer Context API over hooks
 */
export const AuthContext = createContext<ReturnType<typeof useAuthStore> | null>(null);

/**
 * Auth Provider Component
 *
 * Responsibilities:
 * 1. Initialize Firebase auth state listening on mount
 * 2. Set up API client token provider for automatic auth header injection
 * 3. Sync authenticated user with backend on every session start
 * 4. Provide auth state to the entire app via Zustand store
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize auth state from Firebase and set up token provider for API client
  useEffect(() => {
    // Set up API client token provider FIRST so it's available
    // before any auth-triggered API calls
    apiClient.setTokenProvider(async () => {
      return firebase.getAuthToken();
    });

    // Subscribe to Firebase auth state changes
    // This populates the Zustand store with current user
    const unsubscribeAuth = initializeAuth();

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Sync user with backend whenever auth state resolves to signed-in.
  // This ensures the backend user record exists even if the original
  // login-time sync failed (e.g. due to a network issue or bug).
  // Sets `syncing` in the store so downstream pages (e.g. dashboard)
  // can wait before fetching user-dependent data.
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const hasSynced = useRef(false);

  useEffect(() => {
    if (user && !loading && !hasSynced.current) {
      hasSynced.current = true;
      useAuthStore.getState().setSyncing(true);

      // Include pending profile data (firstName/lastName) if this is a new signup
      const pendingProfile = useAuthStore.getState().pendingProfile;
      const syncBody = pendingProfile
        ? { firstName: pendingProfile.firstName, lastName: pendingProfile.lastName }
        : {};

      apiClient
        .post('/auth/sync', syncBody)
        .catch((err) => {
          console.error('Background auth sync failed:', err);
        })
        .finally(() => {
          // Clear pending profile after sync attempt (success or failure)
          useAuthStore.setState({ pendingProfile: null });
          useAuthStore.getState().setSyncing(false);
        });
    }
    if (!user) {
      hasSynced.current = false;
    }
  }, [user, loading]);

  // Get current auth state from store for context value
  const authState = useAuthStore();

  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
}
