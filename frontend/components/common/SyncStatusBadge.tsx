import { Chip, Tooltip } from '@mui/material'
import { Sync, CheckCircleOutline, ErrorOutline } from '@mui/icons-material'
import type { HealthStatus } from '@/lib/types'

interface SyncStatusBadgeProps {
  health: HealthStatus | undefined
  loading?: boolean
}

export function SyncStatusBadge({ health, loading }: SyncStatusBadgeProps) {
  if (loading || !health) {
    return <Chip icon={<Sync />} label="Checking..." size="small" variant="outlined" color="default" />
  }

  const isSyncing = false // Queue depth placeholder; full BullMQ inspection in Phase 4
  const lastSync = health.last_sync?.completed_at
    ? new Date(health.last_sync.completed_at).toLocaleString()
    : 'Never'

  if (isSyncing) {
    return (
      <Tooltip title={`Last sync: ${lastSync}`}>
        <Chip
          icon={<Sync sx={{ animation: 'spin 1s linear infinite', '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }} />}
          label="Syncing..."
          size="small"
          color="info"
          variant="outlined"
        />
      </Tooltip>
    )
  }

  return (
    <Tooltip title={`Last sync: ${lastSync}`}>
      <Chip
        icon={health.status === 'ok' ? <CheckCircleOutline /> : <ErrorOutline />}
        label={`Synced ${lastSync}`}
        size="small"
        color={health.status === 'ok' ? 'success' : 'error'}
        variant="outlined"
      />
    </Tooltip>
  )
}
