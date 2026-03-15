'use client';

import { useAuthStore } from '@/stores/authStore';

/**
 * Hook for accessing auth state and actions
 *
 * Returns the entire auth store state and actions
 *
 * @example
 * const { user, loading, signIn, signOut } = useAuth()
 *
 * @example
 * const user = useAuth(state => state.user)
 */
export function useAuth() {
  return useAuthStore();
}

/**
 * Hook for checking if user is authenticated
 *
 * @example
 * const isAuthenticated = useIsAuthenticated()
 * if (!isAuthenticated) return <LoginPage />
 */
export function useIsAuthenticated() {
  const user = useAuthStore((state) => state.user);
  return user !== null;
}

/**
 * Hook for accessing current user
 * Returns null if not authenticated or still loading
 *
 * @example
 * const user = useCurrentUser()
 * console.log(user?.email)
 */
export function useCurrentUser() {
  return useAuthStore((state) => state.user);
}

/**
 * Hook for checking if auth is loading
 *
 * @example
 * const loading = useAuthLoading()
 * if (loading) return <LoadingSpinner />
 */
export function useAuthLoading() {
  return useAuthStore((state) => state.loading);
}
