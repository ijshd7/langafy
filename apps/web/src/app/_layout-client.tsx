'use client'

import { ReactNode } from 'react'

import { AuthProvider } from '@/contexts/AuthContext'

export function LayoutClient({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
