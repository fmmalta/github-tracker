'use client'
import { Header } from '@/components/dashboard/Header'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { MetricGridSkeleton, ChartSkeleton } from '@/components/dashboard/LoadingSkeletons'
import { SyncStatusBadge } from '@/components/common/SyncStatusBadge'
import { FilterPanel } from '@/components/dashboard/FilterPanel'
import { useOrgMetrics } from '@/hooks/useOrgMetrics'
import { useTrends } from '@/hooks/useTrends'
import { useHealth } from '@/hooks/useHealth'
import { useFirstOrgId } from '@/hooks/useOrgs'
import type { AggregatedMetric } from '@/lib/types'
import { formatHoursToFriendly } from '@/lib/utils'

const FEATURED_METRICS: string[] = [
  'prs_opened_total',
  'prs_merged_total',
  'avg_time_to_merge_hours',
  'reviews_submitted_total',
  'prs_failed_ci_total',
  'failed_deploys_total',
  'deploys_total',
  'commits_total',
]

export default function OrgOverviewPage() {
  const orgId = useFirstOrgId()
  const { data: metricsData, isLoading: metricsLoading } = useOrgMetrics(orgId)
  const { data: trendsData, isLoading: trendsLoading } = useTrends(orgId)
  const { data: health, isLoading: healthLoading } = useHealth()

  const featuredMetrics: AggregatedMetric[] = FEATURED_METRICS.map((metricKey) => {
    const existing = (metricsData?.data ?? []).find((m) => m.metric_key === metricKey)
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
      <Header
        title="Organization Overview"
        rightSlot={<SyncStatusBadge health={health} loading={healthLoading} />}
      />

      <div>
        <FilterPanel />

        <h2 className="text-base font-semibold text-foreground mb-3">Key Metrics</h2>

        {metricsLoading ? (
          <MetricGridSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {featuredMetrics.map((metric) => (
              <MetricCard
                key={metric.metric_key}
                label={metric.definition.name}
                value={metric.metric_key === 'avg_time_to_merge_hours'
                  ? formatHoursToFriendly(metric.total)
                  : metric.total}
                unit={metric.metric_key === 'avg_time_to_merge_hours'
                  ? undefined
                  : (metric.definition.unit !== 'count' ? metric.definition.unit : undefined)}
                definition={metric.definition}
              />
            ))}
          </div>
        )}

        <div className="mt-4">
          {trendsLoading ? (
            <ChartSkeleton />
          ) : (
            <TrendChart
              data={trendsData?.data ?? []}
              title="PR Trend — Opened vs Merged (Selected Period)"
            />
          )}
        </div>
      </div>
    </>
  )
}

export const dynamic = 'force-dynamic'
