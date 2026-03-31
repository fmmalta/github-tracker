import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useFilterParams } from './useFilterParams'
import type { TrendsResponse, TrendDataPoint, MetricKey } from '@/lib/types'

interface RawDailyMetric {
  metric_date: string
  metric_key: string
  metric_value: string
}

interface RawTrendsResponse {
  data: RawDailyMetric[]
}

export function useTrends(orgId: string) {
  const { startDate, endDate } = useFilterParams()
  const start = startDate.toISOString().split('T')[0]
  const end = endDate.toISOString().split('T')[0]

  return useQuery<TrendsResponse>({
    queryKey: ['trends', orgId, start, end],
    queryFn: async () => {
      const raw = await apiGet<RawTrendsResponse>(
        `/api/v1/metrics/trends?org_id=${orgId}&start_date=${start}&end_date=${end}`
      )
      const data: TrendDataPoint[] = raw.data.map((r) => ({
        date: r.metric_date,
        metric_key: r.metric_key as MetricKey,
        value: Number(r.metric_value),
      }))
      return { data, definitions: [] }
    },
    enabled: !!orgId,
  })
}
