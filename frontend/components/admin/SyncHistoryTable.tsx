'use client'
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Chip, Tooltip, TablePagination, Alert, Skeleton,
} from '@mui/material'
import { useState } from 'react'
import { useSyncHistory } from '@/hooks/useSyncHistory'
import type { SyncJob } from '@/lib/types'

function StatusChip({ status }: { status: SyncJob['status'] }) {
  const map: Record<SyncJob['status'], { label: string; color: string }> = {
    success: { label: 'Success', color: '#22c55e' },
    failed: { label: 'Failed', color: '#ef4444' },
    in_progress: { label: 'In Progress', color: '#f59e0b' },
    pending: { label: 'Pending', color: '#64748b' },
  }
  const cfg = map[status] ?? map.pending
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{
        bgcolor: `${cfg.color}22`,
        color: cfg.color,
        borderColor: cfg.color,
        border: '1px solid',
        fontSize: 12,
      }}
    />
  )
}

function TypeChip({ type }: { type: SyncJob['type'] }) {
  const map: Record<SyncJob['type'], { label: string; color: string }> = {
    initial_backfill: { label: 'Initial Backfill', color: '#818cf8' },
    scheduled: { label: 'Scheduled', color: '#64748b' },
    manual: { label: 'Manual', color: '#6366f1' },
  }
  const cfg = map[type] ?? map.scheduled
  return (
    <Chip
      label={cfg.label}
      size="small"
      variant="outlined"
      sx={{ color: cfg.color, borderColor: cfg.color, fontSize: 12 }}
    />
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

export function SyncHistoryTable() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError } = useSyncHistory(page)

  if (isLoading) {
    return (
      <Box>
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} height={52} sx={{ mb: 0.5, borderRadius: 1 }} />
        ))}
      </Box>
    )
  }

  if (isError) {
    return <Alert severity="error" sx={{ mb: 2 }}>Failed to load sync history.</Alert>
  }

  const rows = data?.data ?? []

  if (rows.length === 0 && page === 0) {
    return (
      <Box py={8} textAlign="center">
        <Typography variant="body1" color="text.secondary" fontWeight={600}>
          No sync jobs recorded yet.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Syncs appear here after the first connection.
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Type', 'Status', 'Started', 'Finished', 'Repos', 'Error', 'Retries'].map((h) => (
                <TableCell key={h} sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 500 }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((job) => (
              <TableRow
                key={job.id}
                sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}
              >
                <TableCell><TypeChip type={job.type} /></TableCell>
                <TableCell><StatusChip status={job.status} /></TableCell>
                <TableCell sx={{ fontSize: 13 }}>{formatDate(job.started_at)}</TableCell>
                <TableCell sx={{ fontSize: 13 }}>{formatDate(job.finished_at)}</TableCell>
                <TableCell sx={{ fontSize: 13 }}>{job.repos_synced}</TableCell>
                <TableCell sx={{ maxWidth: 200 }}>
                  {job.error_message ? (
                    <Tooltip title={job.error_message}>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{ maxWidth: 200, cursor: 'help', color: '#ef4444', fontSize: 13 }}
                      >
                        {job.error_message.slice(0, 60)}
                        {job.error_message.length > 60 ? '…' : ''}
                      </Typography>
                    </Tooltip>
                  ) : (
                    <Typography variant="body2" color="text.secondary">—</Typography>
                  )}
                </TableCell>
                <TableCell sx={{ fontSize: 13 }}>{job.retry_count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={data?.total ?? 0}
        page={page}
        rowsPerPage={50}
        rowsPerPageOptions={[50]}
        onPageChange={(_, p) => setPage(p)}
        sx={{ color: 'text.secondary' }}
      />
    </Box>
  )
}
