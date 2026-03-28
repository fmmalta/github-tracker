import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useFilterParams } from './useFilterParams'
import type { MetricsResponse } from '@/lib/types'

export function useDeveloperMetrics(developerId: string, orgId: string) {
  const { startDate, endDate } = useFilterParams()
  const start = startDate.toISOString().split('T')[0]
  const end = endDate.toISOString().split('T')[0]

  return useQuery<MetricsResponse>({
    queryKey: ['developer-metrics', developerId, orgId, start, end],
    queryFn: () =>
      apiGet<MetricsResponse>(
        `/api/v1/metrics/developer/${developerId}?org_id=${orgId}&start_date=${start}&end_date=${end}`
      ),
    enabled: !!developerId && !!orgId,
  })
}
