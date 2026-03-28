'use client'
import { Box, Grid, Typography } from '@mui/material'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/dashboard/Header'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { MetricGridSkeleton, ChartSkeleton } from '@/components/dashboard/LoadingSkeletons'
import { FilterPanel } from '@/components/dashboard/FilterPanel'
import { useRepoMetrics } from '@/hooks/useRepoMetrics'
import { useTrends } from '@/hooks/useTrends'
import { useFilterParams } from '@/hooks/useFilterParams'
import { apiGet } from '@/lib/api-client'
import { DEFAULT_ORG_ID } from '@/lib/constants'
import type { AggregatedMetric, PaginatedResponse, PullRequest } from '@/lib/types'

const FEATURED_REPO_METRICS = [
  'PRS_OPENED_TOTAL',
  'PRS_MERGED_TOTAL',
  'AVG_TIME_TO_MERGE_HOURS',
  'TOTAL_ADDITIONS',
]

interface DevPRCount {
  login: string
  count: number
}

export default function RepoDetailPage() {
  const { repoId } = useParams<{ repoId: string }>()
  const orgId = DEFAULT_ORG_ID
  const { startDate, endDate } = useFilterParams()
  const start = startDate.toISOString().split('T')[0]
  const end = endDate.toISOString().split('T')[0]

  const { data: metricsData, isLoading: metricsLoading } = useRepoMetrics(repoId, orgId)
  const { data: trendsData, isLoading: trendsLoading } = useTrends(orgId)

  // Developer distribution: fetch PRs for this repo and aggregate by developer
  const { data: prData, isLoading: prLoading } = useQuery<PaginatedResponse<PullRequest>>({
    queryKey: ['repo-prs', repoId, orgId, start, end],
    queryFn: () =>
      apiGet<PaginatedResponse<PullRequest>>(
        `/api/v1/data/pull-requests?org_id=${orgId}&repo_id=${repoId}&start_date=${start}&end_date=${end}&limit=200`
      ),
    enabled: !!repoId && !!orgId,
  })

  // Aggregate PR count by developer (top 10)
  const devDistribution: DevPRCount[] = (() => {
    const prs = prData?.data ?? []
    const counts = new Map<string, number>()
    for (const pr of prs) {
      counts.set(pr.developer_login, (counts.get(pr.developer_login) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([login, count]) => ({ login, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  })()

  const featuredMetrics: AggregatedMetric[] = (metricsData?.data ?? []).filter(
    (m) => FEATURED_REPO_METRICS.includes(m.metric_key)
  )

  return (
    <>
      <Header title="Repository Detail" />
      <Box>
        <FilterPanel />

        <Typography variant="h6" fontWeight={600} mb={2}>Repository Metrics</Typography>

        {metricsLoading ? (
          <MetricGridSkeleton count={4} />
        ) : (
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {featuredMetrics.map((metric) => (
              <Grid key={metric.metric_key} size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard
                  label={metric.definition.name}
                  value={metric.total}
                  unit={metric.definition.unit !== 'count' ? metric.definition.unit : undefined}
                  definition={metric.definition}
                />
              </Grid>
            ))}
          </Grid>
        )}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            {trendsLoading ? <ChartSkeleton /> : (
              <TrendChart
                data={(trendsData?.data ?? []).filter(d =>
                  d.metric_key === 'PRS_OPENED_TOTAL' || d.metric_key === 'PRS_MERGED_TOTAL'
                )}
                title="Repository PR Trend"
              />
            )}
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>
              Top 10 Developers by PR Count
            </Typography>
            {prLoading ? (
              <ChartSkeleton />
            ) : devDistribution.length === 0 ? (
              <Typography color="text.secondary" variant="body2">No PR data in selected period.</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={devDistribution} layout="vertical" margin={{ left: 60, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="login" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: '#f5f5f5', border: '1px solid #ccc' }} />
                  <Bar dataKey="count" fill="#1976d2" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Grid>
        </Grid>
      </Box>
    </>
  )
}

export const dynamic = 'force-dynamic'
