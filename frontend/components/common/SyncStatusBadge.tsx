import type { HealthStatus } from '@/lib/types'
import { formatDateTime, formatRelativeTime } from '@/lib/utils'

interface SyncStatusBadgeProps {
  health: HealthStatus | undefined
  loading?: boolean
}

export function SyncStatusBadge({ health, loading }: SyncStatusBadgeProps) {
  if (loading || !health) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs border border-border rounded-full px-2.5 py-1 text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" />
        Checking...
      </span>
    )
  }

  const isSyncing = false // Queue depth placeholder; full BullMQ inspection in Phase 4
  const lastSyncAbsolute = health.last_sync?.completed_at
    ? formatDateTime(health.last_sync.completed_at)
    : 'Never'
  const lastSyncRelative = health.last_sync?.completed_at
    ? formatRelativeTime(health.last_sync.completed_at)
    : 'never'

  if (isSyncing) {
    return (
      <span
        title={`Last sync: ${lastSyncAbsolute}`}
        className="inline-flex items-center gap-1.5 text-xs border border-blue-500/30 rounded-full px-2.5 py-1 text-blue-400"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
        Syncing...
      </span>
    )
  }

  const isOk = health.status === 'ok'

  return (
    <span
      title={`Last sync: ${lastSyncAbsolute}`}
      className={`inline-flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-1 ${
        isOk
          ? 'border-green-500/30 text-green-400'
          : 'border-red-500/30 text-red-400'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isOk ? 'bg-green-400' : 'bg-red-400'}`} />
      Synced {lastSyncRelative}
    </span>
  )
}
