'use client'
import { Box, Grid, Typography, Button } from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Header } from '@/components/dashboard/Header'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { FilterPanel } from '@/components/dashboard/FilterPanel'
import { MetricGridSkeleton, TableSkeleton } from '@/components/dashboard/LoadingSkeletons'
import { DisclaimerBanner } from '@/components/common/DisclaimerBanner'
import { useDeveloperMetrics } from '@/hooks/useDeveloperMetrics'
import { usePullRequests } from '@/hooks/usePullRequests'
import { useFilterParams } from '@/hooks/useFilterParams'
import { DEFAULT_ORG_ID, METRIC_NEUTRAL_DISCLAIMER, DEFAULT_PAGE_SIZE } from '@/lib/constants'
import type { AggregatedMetric, PullRequest } from '@/lib/types'

const FEATURED_DEV_METRICS = [
  'PRS_OPENED_TOTAL',
  'PRS_MERGED_TOTAL',
  'AVG_TIME_TO_MERGE_HOURS',
  'REVIEWS_SUBMITTED_TOTAL',
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
  { field: 'repo_full_name', headerName: 'Repository', flex: 1, minWidth: 160, sortable: false },
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

export default function DeveloperDetailPage() {
  const { developerId } = useParams<{ developerId: string }>()
  const orgId = DEFAULT_ORG_ID
  const router = useRouter()
  const { setDeveloperId, page, setPage } = useFilterParams()

  // Pre-set developerId in URL so usePullRequests auto-filters
  useEffect(() => {
    setDeveloperId(developerId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [developerId])

  const { data: metricsData, isLoading: metricsLoading } = useDeveloperMetrics(developerId, orgId)
  const { data: prData, isLoading: prLoading } = usePullRequests(orgId)

  const featuredMetrics: AggregatedMetric[] = (metricsData?.data ?? []).filter((m) =>
    FEATURED_DEV_METRICS.includes(m.metric_key)
  )
  const currentPage = parseInt(page ?? '0', 10)

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
      </Box>
    </>
  )
}

export const dynamic = 'force-dynamic'
