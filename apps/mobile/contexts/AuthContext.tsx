import React, { createContext, useCallback, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import * as firebase from '@/lib/firebase';
import { initializeApiClient } from '@/lib/api';

/**
 * Auth context interface
 */
export interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<FirebaseUser>;
  signUp: (email: string, password: string) => Promise<FirebaseUser>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

/**
 * Auth context
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth provider component
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sign in with email and password
   */
  const handleSignIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await firebase.signIn(email, password);
      setUser(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sign up with email and password
   */
  const handleSignUp = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await firebase.signUp(email, password);
      setUser(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sign out current user
   */
  const handleSignOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await firebase.signOut();
      setUser(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear error
   */
  const handleClearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Subscribe to auth state changes on mount and initialize API client
   */
  useEffect(() => {
    // Initialize API client with Firebase token provider
    initializeApiClient();

    const unsubscribe = firebase.onAuthStateChange((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    error,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    clearError: handleClearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
