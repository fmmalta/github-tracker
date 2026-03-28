'use client'
import {
  Box, Typography, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, Chip
} from '@mui/material'
import Link from 'next/link'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { Header } from '@/components/dashboard/Header'
import { DisclaimerBanner } from '@/components/common/DisclaimerBanner'
import { FilterPanel } from '@/components/dashboard/FilterPanel'
import { TableSkeleton } from '@/components/dashboard/LoadingSkeletons'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useFilterParams } from '@/hooks/useFilterParams'
import { DEFAULT_ORG_ID, LEADERBOARD_DISCLAIMER } from '@/lib/constants'
import type { LeaderboardEntry, MetricKey } from '@/lib/types'

const SELECTABLE_METRICS: { key: MetricKey; label: string }[] = [
  { key: 'PRS_MERGED_TOTAL', label: 'PRs Merged' },
  { key: 'PRS_OPENED_TOTAL', label: 'PRs Opened' },
  { key: 'REVIEWS_SUBMITTED_TOTAL', label: 'Reviews Submitted' },
  { key: 'AVG_TIME_TO_MERGE_HOURS', label: 'Avg Time to Merge' },
  { key: 'TOTAL_ADDITIONS', label: 'Lines Added' },
]

export default function LeaderboardPage() {
  const orgId = DEFAULT_ORG_ID
  const { metric, setMetric } = useFilterParams()
  const currentMetric = (metric ?? 'PRS_MERGED_TOTAL') as MetricKey
  const { data, isLoading } = useLeaderboard(orgId)

  // Find definition for current metric from API response
  const currentDefinition = data?.definitions?.find((d) => d.key === currentMetric)

  const columns: GridColDef<LeaderboardEntry>[] = [
    {
      field: 'rank',
      headerName: '#',
      width: 60,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'developer_login',
      headerName: 'Developer',
      flex: 1,
      minWidth: 160,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Link
            href={`/developers/${params.row.developer_id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <Typography variant="body2" fontWeight={500} sx={{ '&:hover': { textDecoration: 'underline' } }}>
              {params.value}
            </Typography>
          </Link>
          {params.row.developer_name && (
            <Typography variant="caption" color="text.secondary">
              {params.row.developer_name}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'total',
      headerName: SELECTABLE_METRICS.find((m) => m.key === currentMetric)?.label ?? 'Value',
      flex: 1,
      minWidth: 140,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={params.row.rank <= 3 ? 700 : 400}>
          {typeof params.value === 'number' ? params.value.toLocaleString() : params.value}
        </Typography>
      ),
    },
  ]

  return (
    <>
      <Header title="Developer Leaderboard" />
      <Box>
        {/* Disclaimer MUST be above the table — hard compliance requirement */}
        <DisclaimerBanner
          message={LEADERBOARD_DISCLAIMER}
          variant="warning"
          id="leaderboard-disclaimer"
        />

        <Box display="flex" alignItems="center" gap={2} mb={2} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Rank developers by</InputLabel>
            <Select
              value={currentMetric}
              label="Rank developers by"
              onChange={(e: SelectChangeEvent) => {
                setMetric(e.target.value)
              }}
              aria-label="Select metric for ranking"
            >
              {SELECTABLE_METRICS.map((m) => (
                <MenuItem key={m.key} value={m.key}>{m.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {currentDefinition && (
            <Chip
              label={currentDefinition.formula}
              size="small"
              variant="outlined"
              color="info"
              sx={{ maxWidth: 400 }}
            />
          )}
        </Box>

        <FilterPanel />

        {isLoading ? (
          <TableSkeleton rows={10} />
        ) : (
          <Box
            sx={{ bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
            role="region"
            aria-label="Developer leaderboard"
            aria-describedby="leaderboard-disclaimer"
          >
            <DataGrid
              rows={data?.data ?? []}
              columns={columns}
              getRowId={(row) => row.developer_id}
              autoHeight
              pageSizeOptions={[25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
              disableRowSelectionOnClick
              sx={{ border: 'none' }}
            />
          </Box>
        )}

        {currentDefinition && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>About this metric:</strong> {currentDefinition.disclaimer}
            </Typography>
          </Box>
        )}
      </Box>
    </>
  )
}

export const dynamic = 'force-dynamic'
