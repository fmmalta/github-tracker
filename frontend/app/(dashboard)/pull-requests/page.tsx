'use client'
import { Box, Typography, Chip } from '@mui/material'
import {
  DataGrid,
  GridColDef,
  GridSortModel,
  GridPaginationModel,
} from '@mui/x-data-grid'
import { useState } from 'react'
import { Header } from '@/components/dashboard/Header'
import { FilterPanel } from '@/components/dashboard/FilterPanel'
import { TableSkeleton } from '@/components/dashboard/LoadingSkeletons'
import { usePullRequests } from '@/hooks/usePullRequests'
import { useRepositories } from '@/hooks/useRepositories'
import { useDevelopers } from '@/hooks/useDevelopers'
import { useFilterParams } from '@/hooks/useFilterParams'
import { DEFAULT_ORG_ID, DEFAULT_PAGE_SIZE } from '@/lib/constants'
import type { PullRequest, PullRequestState } from '@/lib/types'

const STATE_COLORS: Record<PullRequestState, 'primary' | 'success' | 'default'> = {
  open: 'primary',
  merged: 'success',
  closed: 'default',
}

// Maps DataGrid sort field to API sort_by value
const SORTABLE_FIELD_MAP: Record<string, string> = {
  number: 'number',
  github_created_at: 'github_created_at',
  github_merged_at: 'github_merged_at',
  additions: 'additions',
  deletions: 'deletions',
}

export default function PullRequestsPage() {
  const orgId = DEFAULT_ORG_ID
  const { page, setPage } = useFilterParams()
  const currentPage = parseInt(page ?? '0', 10)

  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'github_created_at', sort: 'desc' },
  ])

  const sortField = sortModel[0]?.field ?? 'github_created_at'
  const sortDir = sortModel[0]?.sort === 'asc' ? 'ASC' : 'DESC'

  const { data: prData, isLoading: prLoading } = usePullRequests(orgId, {
    sortBy: SORTABLE_FIELD_MAP[sortField] ?? 'github_created_at',
    sortDir,
  })

  const { data: reposData } = useRepositories(orgId)
  const { data: devsData } = useDevelopers(orgId)

  const columns: GridColDef<PullRequest>[] = [
    {
      field: 'number',
      headerName: 'PR #',
      width: 70,
      sortable: true,
      renderCell: (params) => (
        <Typography variant="body2" color="primary">#{params.value}</Typography>
      ),
    },
    {
      field: 'title',
      headerName: 'Title',
      flex: 2,
      minWidth: 200,
      sortable: false,
      renderCell: (params) => (
        <Typography variant="body2" noWrap title={params.value as string}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'repo_full_name',
      headerName: 'Repository',
      flex: 1,
      minWidth: 140,
      sortable: false,
    },
    {
      field: 'developer_login',
      headerName: 'Developer',
      width: 140,
      sortable: false,
    },
    {
      field: 'state',
      headerName: 'State',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={STATE_COLORS[params.value as PullRequestState] ?? 'default'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'github_created_at',
      headerName: 'Created',
      width: 110,
      sortable: true,
      valueFormatter: (value: string) =>
        value ? new Date(value).toLocaleDateString() : '—',
    },
    {
      field: 'github_merged_at',
      headerName: 'Merged',
      width: 110,
      sortable: true,
      valueFormatter: (value: string | null) =>
        value ? new Date(value).toLocaleDateString() : '—',
    },
    {
      field: 'additions',
      headerName: '+Lines',
      width: 80,
      type: 'number',
      sortable: true,
      renderCell: (params) => (
        <Typography variant="body2" color="success.main">+{params.value?.toLocaleString()}</Typography>
      ),
    },
    {
      field: 'deletions',
      headerName: '-Lines',
      width: 80,
      type: 'number',
      sortable: true,
      renderCell: (params) => (
        <Typography variant="body2" color="error.main">-{params.value?.toLocaleString()}</Typography>
      ),
    },
    {
      field: 'review_count',
      headerName: 'Reviews',
      width: 80,
      type: 'number',
      sortable: false,
      align: 'center',
    },
  ]

  const rowCount = prData?.total ?? 0

  return (
    <>
      <Header title="Pull Request Explorer" />
      <Box>
        <FilterPanel
          repos={reposData?.data}
          developers={devsData?.data}
          showStateFilter
          showBranchFilter
        />

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="body2" color="text.secondary">
            {rowCount.toLocaleString()} pull requests found
          </Typography>
        </Box>

        {prLoading && !prData ? (
          <TableSkeleton rows={10} />
        ) : (
          <Box
            sx={{ bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
          >
            <DataGrid
              rows={prData?.data ?? []}
              columns={columns}
              rowCount={rowCount}
              paginationMode="server"
              sortingMode="server"
              paginationModel={{ page: currentPage, pageSize: DEFAULT_PAGE_SIZE }}
              onPaginationModelChange={(model: GridPaginationModel) => {
                setPage(String(model.page))
              }}
              sortModel={sortModel}
              onSortModelChange={(model: GridSortModel) => {
                setSortModel(model)
                setPage('0')
              }}
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
