import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useFilterParams } from './useFilterParams'
import type { LeaderboardResponse } from '@/lib/types'

export function useLeaderboard(orgId: string) {
  const { startDate, endDate, metric } = useFilterParams()
  const start = startDate.toISOString().split('T')[0]
  const end = endDate.toISOString().split('T')[0]
  const metricKey = metric ?? 'PRS_MERGED_TOTAL'

  return useQuery<LeaderboardResponse>({
    queryKey: ['leaderboard', orgId, metricKey, start, end],
    queryFn: () =>
      apiGet<LeaderboardResponse>(
        `/api/v1/metrics/leaderboard?org_id=${orgId}&metric_key=${metricKey}&start_date=${start}&end_date=${end}&limit=50&sort_dir=DESC`
      ),
    enabled: !!orgId,
  })
}
