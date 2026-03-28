import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useFilterParams } from './useFilterParams'
import type { MetricsResponse } from '@/lib/types'

export function useOrgMetrics(orgId: string) {
  const { startDate, endDate } = useFilterParams()
  const start = startDate.toISOString().split('T')[0]
  const end = endDate.toISOString().split('T')[0]

  return useQuery<MetricsResponse>({
    queryKey: ['org-metrics', orgId, start, end],
    queryFn: () =>
      apiGet<MetricsResponse>(
        `/api/v1/metrics/org/${orgId}?start_date=${start}&end_date=${end}`
      ),
    enabled: !!orgId,
  })
}
