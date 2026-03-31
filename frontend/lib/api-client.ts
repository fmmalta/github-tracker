import { getAccessToken, refreshAccessToken, clearTokens } from './auth'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAccessToken()
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? ''

  const makeRequest = (authToken: string | null) =>
    fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options.headers,
      },
    })

  let response = await makeRequest(token)

  if (response.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      response = await makeRequest(newToken)
    } else {
      // Refresh failed — redirect to login
      if (typeof window !== 'undefined') {
        clearTokens()
        window.location.href = '/auth/login'
      }
      throw new ApiError(401, 'Session expired')
    }
  }

  return response
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await apiCall(endpoint)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new ApiError(res.status, err.message ?? 'Request failed')
  }
  return res.json() as Promise<T>
}
