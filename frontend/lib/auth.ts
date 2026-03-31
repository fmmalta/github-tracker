let inMemoryAccessToken: string | null = null

export function getAccessToken(): string | null {
  return inMemoryAccessToken
}

export function setAccessToken(accessToken: string): void {
  inMemoryAccessToken = accessToken
}

export function clearTokens(): void {
  inMemoryAccessToken = null
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
