import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useFilterParams } from './useFilterParams'
import type { TrendsResponse } from '@/lib/types'

export function useTrends(orgId: string) {
  const { startDate, endDate } = useFilterParams()
  const start = startDate.toISOString().split('T')[0]
  const end = endDate.toISOString().split('T')[0]

  return useQuery<TrendsResponse>({
    queryKey: ['trends', orgId, start, end],
    queryFn: () =>
      apiGet<TrendsResponse>(
        `/api/v1/metrics/trends?org_id=${orgId}&start_date=${start}&end_date=${end}`
      ),
    enabled: !!orgId,
  })
}
