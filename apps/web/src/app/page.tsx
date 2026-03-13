'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login - auth state will be checked by middleware in Step 3.5
    router.push('/login')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900">
      <p className="text-slate-400">Redirecting...</p>
    </div>
  )
}
