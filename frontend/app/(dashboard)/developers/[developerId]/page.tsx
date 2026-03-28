'use client'
import { Box, Grid, Typography, Button, Tabs, Tab } from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { parseAsString, useQueryState } from 'nuqs'
import { Header } from '@/components/dashboard/Header'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { FilterPanel } from '@/components/dashboard/FilterPanel'
import { MetricGridSkeleton, TableSkeleton } from '@/components/dashboard/LoadingSkeletons'
import { DisclaimerBanner } from '@/components/common/DisclaimerBanner'
import { DeveloperTrendChart } from '@/components/developer/DeveloperTrendChart'
import { ReviewHistoryTable } from '@/components/developer/ReviewHistoryTable'
import { useDeveloperMetrics } from '@/hooks/useDeveloperMetrics'
import { usePullRequests } from '@/hooks/usePullRequests'
import { useFilterParams } from '@/hooks/useFilterParams'
import { useFirstOrgId } from '@/hooks/useOrgs'
import { useDeveloperTrends } from '@/hooks/useDeveloperTrends'
import { useDeveloperReviews } from '@/hooks/useDeveloperReviews'
import { METRIC_NEUTRAL_DISCLAIMER, DEFAULT_PAGE_SIZE } from '@/lib/constants'
import type { AggregatedMetric, PullRequest } from '@/lib/types'

const FEATURED_DEV_METRICS = [
  'prs_opened',
  'prs_merged',
  'avg_time_to_merge_hours',
  'reviews_submitted',
]

const prColumns: GridColDef<PullRequest>[] = [
  {
    field: 'number',
    headerName: 'PR #',
    width: 70,
    renderCell: (p) => (
      <Typography variant="body2" color="primary">
        #{p.value}
      </Typography>
    ),
  },
  { field: 'title', headerName: 'Title', flex: 2, minWidth: 200, sortable: false },
  { field: 'repository_id', headerName: 'Repository', flex: 1, minWidth: 160, sortable: false },
  { field: 'state', headerName: 'State', width: 90, sortable: false },
  {
    field: 'github_created_at',
    headerName: 'Created',
    width: 110,
    valueFormatter: (v: string) => (v ? new Date(v).toLocaleDateString() : '—'),
  },
  {
    field: 'github_merged_at',
    headerName: 'Merged',
    width: 110,
    valueFormatter: (v: string | null) => (v ? new Date(v).toLocaleDateString() : '—'),
  },
  { field: 'additions', headerName: '+Lines', width: 80, type: 'number' },
  { field: 'deletions', headerName: '-Lines', width: 80, type: 'number' },
  { field: 'review_count', headerName: 'Reviews', width: 80, type: 'number' },
]

const TAB_SLUGS = ['overview', 'prs', 'reviews'] as const

export default function DeveloperDetailPage() {
  const { developerId } = useParams<{ developerId: string }>()
  const orgId = useFirstOrgId()
  const router = useRouter()
  const { setDeveloperId, page, setPage } = useFilterParams()

  // URL-synced tab state via nuqs
  const [tab, setTab] = useQueryState('tab', parseAsString.withDefault('overview'))
  const activeTab = Math.max(0, TAB_SLUGS.indexOf(tab as typeof TAB_SLUGS[number]))

  // Pre-set developerId in URL so usePullRequests auto-filters
  useEffect(() => {
    setDeveloperId(developerId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [developerId])

  const { data: metricsData, isLoading: metricsLoading } = useDeveloperMetrics(developerId, orgId)
  const { data: prData, isLoading: prLoading } = usePullRequests(orgId)
  const { data: trendsData, isLoading: trendsLoading } = useDeveloperTrends(developerId, orgId ?? undefined)
  const { data: reviewsData, isLoading: reviewsLoading, isError: reviewsError } = useDeveloperReviews(developerId, orgId ?? undefined)

  const featuredMetrics: AggregatedMetric[] = (metricsData?.data ?? []).filter((m) =>
    FEATURED_DEV_METRICS.includes(m.metric_key)
  )
  const currentPage = parseInt(page ?? '0', 10)
  const trendPoints = trendsData?.data ?? []
  const reviews = reviewsData?.data ?? []

  return (
    <>
      <Header title="Developer Detail" />
      <Box>
        <Box mb={2}>
          <Button size="small" onClick={() => router.back()} variant="text">
            &larr; Back to leaderboard
          </Button>
        </Box>

        <DisclaimerBanner message={METRIC_NEUTRAL_DISCLAIMER} />

        <FilterPanel />

        <Typography variant="h6" fontWeight={600} mb={2}>
          Developer Metrics
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

        <Tabs
          value={activeTab}
          onChange={(_, newValue: number) => setTab(TAB_SLUGS[newValue])}
          sx={{
            mb: 3,
            '& .MuiTab-root': { color: 'text.secondary', minHeight: 48 },
            '& .Mui-selected': { color: '#818cf8' },
            '& .MuiTabs-indicator': { bgcolor: '#6366f1' },
          }}
        >
          <Tab label="Overview" />
          <Tab label="PRs" />
          <Tab label="Reviews" />
        </Tabs>

        {activeTab === 0 && (
          <DeveloperTrendChart data={trendPoints} loading={trendsLoading} />
        )}

        {activeTab === 1 && (
          <>
            <Typography variant="h6" fontWeight={600} mb={1}>
              PR History
            </Typography>
            {prLoading && !prData ? (
              <TableSkeleton rows={8} />
            ) : (
              <Box
                sx={{ bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
              >
                <DataGrid
                  rows={prData?.data ?? []}
                  columns={prColumns}
                  rowCount={prData?.total ?? 0}
                  paginationMode="server"
                  paginationModel={{ page: currentPage, pageSize: DEFAULT_PAGE_SIZE }}
                  onPaginationModelChange={(model) => setPage(String(model.page))}
                  pageSizeOptions={[DEFAULT_PAGE_SIZE]}
                  autoHeight
                  disableRowSelectionOnClick
                  loading={prLoading}
                  sx={{ border: 'none' }}
                />
              </Box>
            )}
          </>
        )}

        {activeTab === 2 && (
          <ReviewHistoryTable
            reviews={reviews}
            isLoading={reviewsLoading}
            isError={reviewsError}
          />
        )}
      </Box>
    </>
  )
}

export const dynamic = 'force-dynamic'
