let inMemoryAccessToken: string | null = null

export function getAccessToken(): string | null {
  if (inMemoryAccessToken) return inMemoryAccessToken
  if (typeof window === 'undefined') return null
  const token = sessionStorage.getItem('accessToken')
  inMemoryAccessToken = token
  return token
}

export function setAccessToken(accessToken: string): void {
  inMemoryAccessToken = accessToken
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('accessToken', accessToken)
  }
}

export function clearTokens(): void {
  inMemoryAccessToken = null
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('accessToken')
  }
  // Clear auth cookie
  if (typeof document !== 'undefined') {
    document.cookie = 'auth_present=; path=/; max-age=0'
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    })
    if (!res.ok) {
      clearTokens()
      return null
    }
    const { accessToken } = await res.json()
    setAccessToken(accessToken)
    return accessToken
  } catch {
    return null
  }
}
