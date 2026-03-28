'use client'
import { Box, Typography } from '@mui/material'
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import Link from 'next/link'
import { Header } from '@/components/dashboard/Header'
import { TableSkeleton } from '@/components/dashboard/LoadingSkeletons'
import { useRepositories } from '@/hooks/useRepositories'
import { DEFAULT_ORG_ID } from '@/lib/constants'
import type { Repository } from '@/lib/types'

const columns: GridColDef<Repository>[] = [
  {
    field: 'name',
    headerName: 'Repository',
    flex: 1,
    minWidth: 200,
    renderCell: (params: GridRenderCellParams<Repository>) => (
      <Link href={`/repos/${params.row.id}`} style={{ color: 'inherit', fontWeight: 500 }}>
        {params.value}
      </Link>
    ),
  },
  {
    field: 'full_name',
    headerName: 'Full Name',
    flex: 1,
    minWidth: 200,
  },
  {
    field: 'created_at',
    headerName: 'Created',
    width: 160,
    valueFormatter: (value: string) => new Date(value).toLocaleDateString(),
  },
]

export default function ReposPage() {
  const { data, isLoading } = useRepositories(DEFAULT_ORG_ID)

  return (
    <>
      <Header title="Repositories" />
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="body2" color="text.secondary">
            {data?.total ?? 0} repositories in organization
          </Typography>
        </Box>

        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : (
          <Box sx={{ bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <DataGrid
              rows={data?.data ?? []}
              columns={columns}
              autoHeight
              pageSizeOptions={[25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
              disableRowSelectionOnClick
              sx={{ border: 'none' }}
            />
          </Box>
        )}
      </Box>
    </>
  )
}

export const dynamic = 'force-dynamic'
