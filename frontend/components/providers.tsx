'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { queryClient } from '@/lib/query-client'
import { getAccessToken, refreshAccessToken } from '@/lib/auth'

function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(() => !!getAccessToken())

  useEffect(() => {
    if (getAccessToken()) {
      setReady(true)
      return
    }
    refreshAccessToken().finally(() => setReady(true))
  }, [])

  if (!ready) return null

  return <>{children}</>
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        <AuthGate>{children}</AuthGate>
      </QueryClientProvider>
    </NuqsAdapter>
  )
}
