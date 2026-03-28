'use client'
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Chip, Skeleton, Alert
} from '@mui/material'
import type { DeveloperReview } from '@/lib/types'

interface ReviewHistoryTableProps {
  reviews: DeveloperReview[]
  isLoading: boolean
  isError: boolean
}

function ReviewStateChip({ state }: { state: DeveloperReview['state'] }) {
  const map: Record<DeveloperReview['state'], { label: string; color: string }> = {
    approved: { label: 'Approved', color: '#22c55e' },
    changes_requested: { label: 'Changes Requested', color: '#ef4444' },
    commented: { label: 'Commented', color: '#64748b' },
    dismissed: { label: 'Dismissed', color: '#64748b' },
  }
  const cfg = map[state] ?? map.commented
  return (
    <Chip
      label={cfg.label}
      size="small"
      variant="outlined"
      sx={{ color: cfg.color, borderColor: cfg.color, fontSize: 12 }}
    />
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
}

export function ReviewHistoryTable({ reviews, isLoading, isError }: ReviewHistoryTableProps) {
  if (isLoading) {
    return <Box>{[...Array(8)].map((_, i) => <Skeleton key={i} height={52} sx={{ mb: 0.5 }} />)}</Box>
  }

  if (isError) {
    return <Alert severity="error">Failed to load review history.</Alert>
  }

  if (reviews.length === 0) {
    return (
      <Box py={8} textAlign="center">
        <Typography color="text.secondary">
          No reviews recorded for this developer in the available data range.
        </Typography>
      </Box>
    )
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {['PR Title', 'Repo', 'Review State', 'Date Reviewed'].map((h) => (
              <TableCell key={h} sx={{ color: 'text.secondary', fontSize: 14 }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {reviews.map((review) => (
            <TableRow key={review.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
              <TableCell sx={{ maxWidth: 300 }}>
                <Typography
                  variant="body2"
                  noWrap
                  title={review.pr_title}
                  sx={{ maxWidth: 280 }}
                >
                  #{review.pr_number} {review.pr_title}
                </Typography>
              </TableCell>
              <TableCell sx={{ fontSize: 14, color: 'text.secondary' }}>{review.repo_name}</TableCell>
              <TableCell><ReviewStateChip state={review.state} /></TableCell>
              <TableCell sx={{ fontSize: 14 }}>{formatDate(review.date_reviewed)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
