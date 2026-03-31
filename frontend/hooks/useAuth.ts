'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAccessToken, clearTokens } from '@/lib/auth'
import type { AuthUser } from '@/lib/types'

function parseJwtPayload(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return { id: payload.sub, email: payload.email, role: payload.role }
  } catch {
    return null
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = getAccessToken()
    if (token) {
      setUser(parseJwtPayload(token))
    }
    setLoading(false)
  }, [])

  const logout = () => {
    clearTokens()
    router.push('/auth/login')
  }

  return { user, loading, logout, isAdmin: user?.role === 'admin' }
}
