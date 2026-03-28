'use client'
import { Box, Grid, Typography } from '@mui/material'
import { Header } from '@/components/dashboard/Header'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { MetricGridSkeleton, ChartSkeleton } from '@/components/dashboard/LoadingSkeletons'
import { SyncStatusBadge } from '@/components/common/SyncStatusBadge'
import { FilterPanel } from '@/components/dashboard/FilterPanel'
import { useOrgMetrics } from '@/hooks/useOrgMetrics'
import { useTrends } from '@/hooks/useTrends'
import { useHealth } from '@/hooks/useHealth'
import { DEFAULT_ORG_ID } from '@/lib/constants'
import type { AggregatedMetric } from '@/lib/types'

// Display these 4 KPIs prominently; filter from API response by metric_key
const FEATURED_METRICS: string[] = [
  'PRS_OPENED_TOTAL',
  'PRS_MERGED_TOTAL',
  'AVG_TIME_TO_MERGE_HOURS',
  'REVIEWS_SUBMITTED_TOTAL',
]

export default function OrgOverviewPage() {
  const orgId = DEFAULT_ORG_ID
  const { data: metricsData, isLoading: metricsLoading } = useOrgMetrics(orgId)
  const { data: trendsData, isLoading: trendsLoading } = useTrends(orgId)
  const { data: health, isLoading: healthLoading } = useHealth()

  const featuredMetrics: AggregatedMetric[] = (metricsData?.data ?? []).filter(
    (m) => FEATURED_METRICS.includes(m.metric_key)
  )

  return (
    <>
      <Header
        title="Organization Overview"
        rightSlot={<SyncStatusBadge health={health} loading={healthLoading} />}
      />

      <Box>
        <FilterPanel />

        <Typography variant="h6" fontWeight={600} mb={2}>
          Key Metrics
        </Typography>

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

        <Box mt={3}>
          {trendsLoading ? (
            <ChartSkeleton />
          ) : (
            <TrendChart
              data={trendsData?.data ?? []}
              title="PR Trend — Opened vs Merged (Selected Period)"
            />
          )}
        </Box>
      </Box>
    </>
  )
}

export const dynamic = 'force-dynamic'
