import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import type { HealthStatus } from '@/lib/types'

export function useHealth() {
  return useQuery<HealthStatus>({
    queryKey: ['health'],
    queryFn: () => apiGet<HealthStatus>('/api/v1/health'),
    staleTime: 30 * 1000,       // 30s — health polling for near-real-time queue visibility
    refetchInterval: 30 * 1000, // Auto-refresh every 30s
  })
}
