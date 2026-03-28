'use client'
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Button, Alert, Tooltip, TablePagination,
} from '@mui/material'
import { useState } from 'react'
import { useWebhookDlq } from '@/hooks/useWebhookDlq'
import { useWebhookRetry } from '@/hooks/useWebhookRetry'
import type { WebhookDelivery } from '@/lib/types'

export function WebhookDLQTable() {
  const [page, setPage] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [retryErrorId, setRetryErrorId] = useState<string | null>(null)
  const { data, isLoading, isError } = useWebhookDlq(page)
  const retryMutation = useWebhookRetry()

  if (isLoading) {
    return (
      <Box>
        {[...Array(8)].map((_, i) => (
          <Box
            key={i}
            sx={{ height: 52, mb: 0.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1 }}
          />
        ))}
      </Box>
    )
  }

  if (isError) {
    return <Alert severity="error">Failed to load webhook deliveries.</Alert>
  }

  const rows = data?.data ?? []

  if (rows.length === 0 && page === 0) {
    return (
      <Box py={8} textAlign="center">
        <Typography variant="body1" color="text.secondary" fontWeight={600}>
          No failed webhooks.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          All deliveries are processing normally.
        </Typography>
      </Box>
    )
  }

  const handleRetry = (delivery: WebhookDelivery, e: React.MouseEvent) => {
    e.stopPropagation()
    setRetryErrorId(null)
    retryMutation.mutate(delivery.id, {
      onError: () => setRetryErrorId(delivery.id),
    })
  }

  return (
    <Box>
      {retryErrorId && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setRetryErrorId(null)}>
          Retry failed. Try again or contact your system administrator.
        </Alert>
      )}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Delivery ID', 'Event', 'Received', 'Error', 'Retries', 'Action'].map((h) => (
                <TableCell key={h} sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 500 }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((delivery) => (
              <>
                <TableRow
                  key={delivery.id}
                  onClick={() => setExpandedId(expandedId === delivery.id ? null : delivery.id)}
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}
                >
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {delivery.delivery_id.slice(0, 16)}…
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{delivery.event_type}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>
                    {new Date(delivery.received_at).toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    {delivery.error_message ? (
                      <Tooltip title={delivery.error_message}>
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ maxWidth: 200, cursor: 'help', color: '#ef4444', fontSize: 13 }}
                        >
                          {delivery.error_message.slice(0, 60)}
                          {delivery.error_message.length > 60 ? '…' : ''}
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" color="text.secondary">—</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{delivery.retry_count}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={
                        retryMutation.isPending && retryMutation.variables === delivery.id
                      }
                      onClick={(e) => handleRetry(delivery, e)}
                      sx={{
                        minHeight: 36,
                        borderColor: '#6366f1',
                        color: '#6366f1',
                        '&:hover': { borderColor: '#818cf8', color: '#818cf8' },
                        '&:focus': { outlineColor: '#6366f1' },
                        '&.Mui-disabled': { opacity: 0.5 },
                      }}
                    >
                      {retryMutation.isPending && retryMutation.variables === delivery.id
                        ? 'Retrying...'
                        : 'Retry'}
                    </Button>
                  </TableCell>
                </TableRow>
                {expandedId === delivery.id && (
                  <TableRow key={`${delivery.id}-expanded`}>
                    <TableCell colSpan={6} sx={{ p: 0, bgcolor: '#1a1a24' }}>
                      <Box
                        component="pre"
                        sx={{
                          m: 0,
                          p: 2,
                          fontSize: 13,
                          fontFamily: 'monospace',
                          color: '#f1f5f9',
                          maxHeight: 200,
                          overflow: 'auto',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                        }}
                      >
                        {JSON.stringify(delivery.payload_json, null, 2)}
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </>
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
