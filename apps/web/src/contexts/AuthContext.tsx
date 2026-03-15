'use client'

import { ReactNode, useEffect, createContext } from 'react'

import { apiClient } from '@/lib/api'
import * as firebase from '@/lib/firebase'
import { useAuthStore, initializeAuth } from '@/stores/authStore'

/**
 * Auth Context type for accessing auth state
 * Exported for consumers who prefer Context API over hooks
 */
export const AuthContext = createContext<ReturnType<typeof useAuthStore> | null>(
  null
)

/**
 * Auth Provider Component
 *
 * Responsibilities:
 * 1. Initialize Firebase auth state listening on mount
 * 2. Set up API client token provider for automatic auth header injection
 * 3. Provide auth state to the entire app via Zustand store
 *
 * Usage:
 * ```tsx
 * <AuthProvider>
 *   <YourApp />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize auth state from Firebase and set up token provider for API client
  useEffect(() => {
    // Subscribe to Firebase auth state changes
    // This populates the Zustand store with current user
    const unsubscribeAuth = initializeAuth()

    // Set up API client token provider
    // This automatically injects Firebase token into all API requests
    apiClient.setTokenProvider(async () => {
      return firebase.getAuthToken()
    })

    return () => {
      unsubscribeAuth()
    }
  }, [])

  // Get current auth state from store for context value
  const authState = useAuthStore()

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  )
}
