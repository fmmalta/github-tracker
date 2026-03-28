import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import type { HealthStatus } from '@/lib/types'

export function useHealth() {
  return useQuery<HealthStatus>({
    queryKey: ['health'],
    queryFn: () => apiGet<HealthStatus>('/api/v1/metrics/health'),
    staleTime: 60 * 1000,       // 1 minute — health is not critical to cache long
    refetchInterval: 60 * 1000, // Auto-refresh every 60s
  })
}
