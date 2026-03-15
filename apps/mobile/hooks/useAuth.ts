import { useContext } from 'react';

import { AuthContext, AuthContextType } from '@/contexts/AuthContext';

/**
 * Hook to access the auth context
 * Must be used within an AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
