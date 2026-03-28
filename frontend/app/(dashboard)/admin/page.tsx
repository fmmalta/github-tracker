'use client'
import {
  Box, Typography, Button, Alert, Card, CardContent, Grid, Tabs, Tab, Skeleton,
} from '@mui/material'
import { Sync, Lock } from '@mui/icons-material'
import { useState } from 'react'
import { parseAsString, useQueryState } from 'nuqs'
import { Header } from '@/components/dashboard/Header'
import { SyncStatusBadge } from '@/components/common/SyncStatusBadge'
import { SyncHistoryTable } from '@/components/admin/SyncHistoryTable'
import { WebhookDLQTable } from '@/components/admin/WebhookDLQTable'
import { useHealth } from '@/hooks/useHealth'
import { useAdminSync } from '@/hooks/useAdminSync'
import { useAuth } from '@/hooks/useAuth'
import type { HealthStatus } from '@/lib/types'

const COOLDOWN_SECONDS = 3600 // 1 hour

function isCooldownActive(lastSync: string | null | undefined): boolean {
  if (!lastSync) return false
  const elapsed = (Date.now() - new Date(lastSync).getTime()) / 1000
  return elapsed < COOLDOWN_SECONDS
}

function cooldownRemainingMinutes(lastSync: string | null | undefined): number {
  if (!lastSync) return 0
  const elapsed = (Date.now() - new Date(lastSync).getTime()) / 1000
  return Math.max(0, Math.ceil((COOLDOWN_SECONDS - elapsed) / 60))
}

function formatRelativeTime(seconds: number | null): string {
  if (seconds === null) return 'none'
  if (seconds < 60) return `${seconds}s ago`
  return `${Math.floor(seconds / 60)} minutes ago`
}

function QueueCard({
  label,
  value,
  threshold,
}: {
  label: string
  value: number
  threshold?: number
}) {
  const isBreached = threshold !== undefined && value > threshold
  return (
    <Card
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: isBreached ? '#ef4444' : 'rgba(255,255,255,0.07)',
        transition: 'border-color 0.2s',
      }}
    >
      <CardContent>
        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
          {label}
        </Typography>
        <Typography
          sx={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
            color: isBreached ? '#ef4444' : 'text.primary',
          }}
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
  )
}

function OverviewTab({
  health,
  isLoading,
}: {
  health: HealthStatus | undefined
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <Grid container spacing={2} mb={3}>
        {[...Array(4)].map((_, i) => (
          <Grid key={i} size={{ xs: 6, sm: 3 }}>
            <Skeleton variant="rectangular" height={90} sx={{ borderRadius: 1 }} />
          </Grid>
        ))}
      </Grid>
    )
  }

  if (!health) {
    return (
      <Typography color="text.secondary">
        Queue status unavailable. Data may be stale.
      </Typography>
    )
  }

  const { queue } = health
  return (
    <Box>
      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <QueueCard label="Pending" value={queue.pending} threshold={1000} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <QueueCard label="Active" value={queue.active} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <QueueCard label="Delayed" value={queue.delayed} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <QueueCard label="Failed" value={queue.failed} threshold={5} />
        </Grid>
      </Grid>
      <Typography variant="body2" color="text.secondary">
        Oldest pending: {formatRelativeTime(queue.oldest_pending_age_seconds)}
      </Typography>
    </Box>
  )
}

function ManualSyncTab({
  health,
  healthLoading,
}: {
  health: HealthStatus | undefined
  healthLoading: boolean
}) {
  const { mutate: triggerSync, isPending, isSuccess, isError, error, reset } = useAdminSync()
  const [hasTriggered, setHasTriggered] = useState(false)
  const cooldown = isCooldownActive(health?.last_sync?.completed_at)
  const remainingMinutes = cooldownRemainingMinutes(health?.last_sync?.completed_at)

  const handleSync = () => {
    reset()
    setHasTriggered(true)
    triggerSync()
  }

  return (
    <Card sx={{ maxWidth: 600, bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.07)' }}>
      <CardContent>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Manual Sync
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Triggers an immediate data sync from GitHub. Use sparingly — syncs run automatically
          at 2am UTC. Minimum 1 hour between manual syncs.
        </Typography>

        {isSuccess && hasTriggered && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={reset}>
            Sync triggered. GitHub data will be updated within a few minutes.
          </Alert>
        )}
        {isError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={reset}>
            {error?.message ?? 'Failed to trigger sync.'} — If this continues, check the
            Webhooks tab for failed deliveries.
          </Alert>
        )}
        {cooldown && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Sync cooldown active. Available in {remainingMinutes}{' '}
            {remainingMinutes === 1 ? 'minute' : 'minutes'}.
          </Alert>
        )}

        <Button
          variant="contained"
          startIcon={<Sync />}
          onClick={handleSync}
          disabled={isPending || cooldown || healthLoading}
          sx={{
            bgcolor: '#6366f1',
            '&:hover': { bgcolor: '#818cf8' },
            minHeight: 48,
          }}
        >
          {isPending
            ? 'Triggering...'
            : cooldown
              ? `Sync on cooldown (${remainingMinutes}m remaining)`
              : 'Trigger Sync Now'}
        </Button>
      </CardContent>
    </Card>
  )
}

const TAB_SLUGS = ['overview', 'sync-history', 'webhooks', 'manual-sync'] as const
type TabSlug = (typeof TAB_SLUGS)[number]

export default function AdminPage() {
  const { isAdmin } = useAuth()
  const { data: health, isLoading: healthLoading } = useHealth()
  const [tab, setTab] = useQueryState('tab', parseAsString.withDefault('overview'))

  if (!isAdmin) {
    return (
      <>
        <Header title="Admin — Observability" />
        <Box
          sx={{ mt: 10 }}
          display="flex"
          alignItems="center"
          gap={1}
          justifyContent="center"
        >
          <Lock sx={{ color: '#ef4444' }} />
          <Typography color="error">
            Admin access required. Contact your administrator to request access.
          </Typography>
        </Box>
      </>
    )
  }

  const tabIndex = TAB_SLUGS.indexOf((tab as TabSlug) ?? 'overview')
  const activeTab = tabIndex === -1 ? 0 : tabIndex

  return (
    <>
      <Header
        title="Admin — Observability"
        rightSlot={<SyncStatusBadge health={health} loading={healthLoading} />}
      />
      <Box sx={{ mt: 10, mx: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, i: number) => setTab(TAB_SLUGS[i])}
          sx={{
            mb: 3,
            '& .MuiTab-root': { color: 'text.secondary', minHeight: 48 },
            '& .Mui-selected': { color: '#818cf8' },
            '& .MuiTabs-indicator': { bgcolor: '#6366f1' },
          }}
        >
          <Tab label="Overview" />
          <Tab label="Sync History" />
          <Tab label="Webhooks" />
          <Tab label="Manual Sync" />
        </Tabs>

        {activeTab === 0 && <OverviewTab health={health} isLoading={healthLoading} />}
        {activeTab === 1 && <SyncHistoryTable />}
        {activeTab === 2 && <WebhookDLQTable />}
        {activeTab === 3 && <ManualSyncTab health={health} healthLoading={healthLoading} />}
      </Box>
    </>
  )
}
