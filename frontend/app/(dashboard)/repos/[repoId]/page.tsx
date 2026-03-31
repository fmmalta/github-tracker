'use client'
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
import { useFirstOrgId } from '@/hooks/useOrgs'
import type { AggregatedMetric, PaginatedResponse, PullRequest } from '@/lib/types'

const FEATURED_REPO_METRICS = [
  'prs_opened_total',
  'prs_merged_total',
  'avg_time_to_merge_hours',
  'additions',
  'prs_failed_ci_total',
  'deploys',
  'failed_deploys',
  'commits_total',
]

interface DevPRCount {
  login: string
  count: number
}

export default function RepoDetailPage() {
  const { repoId } = useParams<{ repoId: string }>()
  const orgId = useFirstOrgId()
  const { startDate, endDate } = useFilterParams()
  const start = startDate.toISOString().split('T')[0]
  const end = endDate.toISOString().split('T')[0]

  const { data: metricsData, isLoading: metricsLoading } = useRepoMetrics(repoId, orgId)
  const { data: trendsData, isLoading: trendsLoading } = useTrends(orgId)

  const { data: prData, isLoading: prLoading } = useQuery<PaginatedResponse<PullRequest>>({
    queryKey: ['repo-prs', repoId, orgId, start, end],
    queryFn: () =>
      apiGet<PaginatedResponse<PullRequest>>(
        `/api/v1/pull-requests?org_id=${orgId}&repo_id=${repoId}&start_date=${start}&end_date=${end}&limit=200`
      ),
    enabled: !!repoId && !!orgId,
  })

  const devDistribution: DevPRCount[] = (() => {
    const prs = prData?.data ?? []
    const counts = new Map<string, number>()
    for (const pr of prs) {
      counts.set(pr.author_login, (counts.get(pr.author_login) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([login, count]) => ({ login, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  })()

  const featuredMetrics: AggregatedMetric[] = (metricsData?.data ?? []).filter(
    (m) => FEATURED_REPO_METRICS.includes(m.metric_key)
  )
  const normalizedFeaturedMetrics: AggregatedMetric[] = FEATURED_REPO_METRICS.map((metricKey) => {
    const existing = featuredMetrics.find((m) => m.metric_key === metricKey)
    if (existing) return existing

    const defs = (metricsData?.definitions ?? []) as unknown
    const fallbackDefinition = Array.isArray(defs)
      ? defs.find((d: { key: string }) => d.key === metricKey)
      : (defs as Record<string, unknown>)[metricKey]

    return {
      metric_key: metricKey as AggregatedMetric['metric_key'],
      total: 0,
      definition: (fallbackDefinition ?? {
        key: metricKey,
        name: metricKey,
        formula: 'No data yet for selected period.',
        unit: 'count',
        disclaimer: 'Metric appears as zero until deployment data is ingested and aggregated.',
      }) as AggregatedMetric['definition'],
    }
  })

  return (
    <>
      <Header title="Repository Detail" />
      <div>
        <FilterPanel />

        <h2 className="text-base font-semibold text-foreground mb-3">Repository Metrics</h2>

        {metricsLoading ? (
          <MetricGridSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {normalizedFeaturedMetrics.map((metric) => (
              <MetricCard
                key={metric.metric_key}
                label={metric.definition.name}
                value={metric.total}
                unit={metric.definition.unit !== 'count' ? metric.definition.unit : undefined}
                definition={metric.definition}
              />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            {trendsLoading ? <ChartSkeleton /> : (
              <TrendChart
                data={(trendsData?.data ?? []).filter(d =>
                  d.metric_key === 'prs_opened_total' || d.metric_key === 'prs_merged_total'
                )}
                title="Repository PR Trend"
              />
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground mb-2">
              Top 10 Developers by PR Count
            </p>
            {prLoading ? (
              <ChartSkeleton />
            ) : devDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground">No PR data in selected period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={devDistribution} layout="vertical" margin={{ left: 60, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="login" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: '#13131a', borderColor: 'rgba(255,255,255,0.07)', color: '#f1f5f9' }} />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export const dynamic = 'force-dynamic'
