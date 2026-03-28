'use client'
import {
  Box, Typography, Button, Alert, Card, CardContent, Grid, Chip, Divider
} from '@mui/material'
import { Sync, Lock } from '@mui/icons-material'
import { useState } from 'react'
import { Header } from '@/components/dashboard/Header'
import { SyncStatusBadge } from '@/components/common/SyncStatusBadge'
import { useHealth } from '@/hooks/useHealth'
import { useAdminSync } from '@/hooks/useAdminSync'
import { useAuth } from '@/hooks/useAuth'

const COOLDOWN_SECONDS = 3600 // 1 hour

function isCooldownActive(lastSync: string | null | undefined): boolean {
  if (!lastSync) return false
  const lastSyncMs = new Date(lastSync).getTime()
  const elapsedSeconds = (Date.now() - lastSyncMs) / 1000
  return elapsedSeconds < COOLDOWN_SECONDS
}

function cooldownRemainingMinutes(lastSync: string | null | undefined): number {
  if (!lastSync) return 0
  const elapsed = (Date.now() - new Date(lastSync).getTime()) / 1000
  return Math.max(0, Math.ceil((COOLDOWN_SECONDS - elapsed) / 60))
}

export default function AdminPage() {
  const { isAdmin } = useAuth()
  const { data: health, isLoading: healthLoading } = useHealth()
  const { mutate: triggerSync, isPending, isSuccess, isError, error, reset } = useAdminSync()
  const [hasTriggered, setHasTriggered] = useState(false)

  if (!isAdmin) {
    return (
      <>
        <Header title="Admin" />
        <Box sx={{ mt: 10, ml: 3 }} display="flex" alignItems="center" gap={1}>
          <Lock color="error" />
          <Typography color="error">
            Access denied. Admin role required.
          </Typography>
        </Box>
      </>
    )
  }

  const cooldown = isCooldownActive(health?.last_sync?.completed_at)
  const remainingMinutes = cooldownRemainingMinutes(health?.last_sync?.completed_at)
  const isSyncing = false // Queue depth placeholder; full BullMQ inspection in Phase 4

  const handleSync = () => {
    reset()
    setHasTriggered(true)
    triggerSync()
  }

  return (
    <>
      <Header
        title="Admin — Sync Controls"
        rightSlot={<SyncStatusBadge health={health} loading={healthLoading} />}
      />
      <Box sx={{ mt: 10, ml: 3, maxWidth: 600 }}>
        {isSuccess && hasTriggered && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={reset}>
            Sync triggered successfully. Data will be updated shortly.
          </Alert>
        )}
        {isError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={reset}>
            {error?.message ?? 'Failed to trigger sync. Please try again.'}
          </Alert>
        )}

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Queue Status
            </Typography>
            <Grid container spacing={2}>
              {[
                { label: 'Queue Depth', value: health?.queue.metrics_queue_depth ?? 0 },
              ].map(({ label, value }) => (
                <Grid size={{ xs: 6, sm: 3 }} key={label}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <Typography variant="h5" fontWeight={700} color="text.primary">
                    {value}
                  </Typography>
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="body2" color="text.secondary">
              Last sync: {health?.last_sync?.completed_at
                ? new Date(health.last_sync.completed_at).toLocaleString()
                : 'Never'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Last aggregation: {health?.last_metrics_aggregation
                ? new Date(health.last_metrics_aggregation).toLocaleString()
                : 'Never'}
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Manual Sync
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Triggers an immediate data sync from GitHub. Use sparingly — syncs run automatically
              at 2am UTC. Minimum 1 hour between manual syncs.
            </Typography>

            {cooldown && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Cooldown active: {remainingMinutes} minutes remaining before next sync is allowed.
              </Alert>
            )}

            <Button
              variant="contained"
              startIcon={<Sync />}
              onClick={handleSync}
              disabled={isPending || cooldown || isSyncing || healthLoading}
              color="primary"
            >
              {isPending
                ? 'Triggering...'
                : isSyncing
                  ? 'Sync in progress...'
                  : cooldown
                    ? `Cooldown (${remainingMinutes}m)`
                    : 'Trigger Sync Now'}
            </Button>

            {cooldown && (
              <Chip
                label={`Available in ${remainingMinutes} min`}
                size="small"
                color="warning"
                sx={{ ml: 2 }}
              />
            )}
          </CardContent>
        </Card>
      </Box>
    </>
  )
}
