'use client'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import type { TrendsResponse } from '@/lib/types'

export function useDeveloperTrends(developerId: string | undefined, orgId: string | undefined) {
  const endDate = new Date()
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const start = startDate.toISOString().split('T')[0]
  const end = endDate.toISOString().split('T')[0]

  return useQuery<TrendsResponse>({
    queryKey: ['developer-trends', developerId, orgId],
    queryFn: () =>
      apiGet<TrendsResponse>(
        `/api/v1/metrics/trends?org_id=${orgId ?? ''}&developer_id=${developerId}&start_date=${start}&end_date=${end}`,
      ),
    enabled: !!developerId && !!orgId,
    staleTime: 5 * 60 * 1000,
  })
}
