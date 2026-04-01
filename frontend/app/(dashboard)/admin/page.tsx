'use client'
import { useState } from 'react'
import { parseAsString, useQueryState } from 'nuqs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Lock, Plus, Check, Loader2 } from 'lucide-react'
import { Header } from '@/components/dashboard/Header'
import { SyncStatusBadge } from '@/components/common/SyncStatusBadge'
import { SyncHistoryTable } from '@/components/admin/SyncHistoryTable'
import { WebhookDLQTable } from '@/components/admin/WebhookDLQTable'
import { useHealth } from '@/hooks/useHealth'
import { useAdminSync } from '@/hooks/useAdminSync'
import { useAuth } from '@/hooks/useAuth'
import { apiCall, apiGet, ApiError } from '@/lib/api-client'
import type { HealthStatus } from '@/lib/types'

const COOLDOWN_SECONDS = 3600

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
    <div
      className={`rounded-lg border bg-card p-4 transition-colors ${
        isBreached ? 'border-red-500' : 'border-border/40'
      }`}
    >
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-3xl font-semibold tracking-tight leading-none ${isBreached ? 'text-red-400' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  )
}

function OverviewTab({ health, isLoading }: { health: HealthStatus | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[90px] bg-muted rounded-lg" />
        ))}
      </div>
    )
  }

  if (!health?.queue) {
    return (
      <p className="text-sm text-muted-foreground">Queue status unavailable. Data may be stale.</p>
    )
  }

  const { queue } = health
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <QueueCard label="Pending" value={queue.pending} threshold={1000} />
        <QueueCard label="Active" value={queue.active} />
        <QueueCard label="Delayed" value={queue.delayed} />
        <QueueCard label="Failed" value={queue.failed} threshold={5} />
      </div>
      <p className="text-xs text-muted-foreground">
        Oldest pending: {formatRelativeTime(queue.oldest_pending_age_seconds)}
      </p>
    </div>
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
    <div className="max-w-xl border border-border/40 rounded-lg bg-card p-5">
      <h3 className="text-base font-semibold text-foreground mb-1">Manual Sync</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Triggers an immediate data sync from GitHub. Use sparingly — syncs run automatically
        at 2am UTC. Minimum 1 hour between manual syncs.
      </p>

      {isSuccess && hasTriggered && (
        <div className="border-l-2 border-green-500 bg-green-500/10 text-green-400 p-3 rounded mb-3 text-sm flex justify-between">
          <span>Sync triggered. GitHub data will be updated within a few minutes.</span>
          <button type="button" onClick={reset} className="ml-2 hover:text-green-200">×</button>
        </div>
      )}
      {isError && (
        <div className="border-l-2 border-red-500 bg-red-500/10 text-red-400 p-3 rounded mb-3 text-sm flex justify-between">
          <span>{error?.message ?? 'Failed to trigger sync.'} — If this continues, check the Webhooks tab for failed deliveries.</span>
          <button type="button" onClick={reset} className="ml-2 hover:text-red-200">×</button>
        </div>
      )}
      {cooldown && (
        <div className="border-l-2 border-blue-500 bg-blue-500/10 text-blue-400 p-3 rounded mb-3 text-sm">
          Sync cooldown active. Available in {remainingMinutes}{' '}
          {remainingMinutes === 1 ? 'minute' : 'minutes'}.
        </div>
      )}

      <button
        type="button"
        onClick={handleSync}
        disabled={isPending || cooldown || healthLoading}
        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded px-4 py-2.5 disabled:opacity-50 transition-colors"
      >
        <RefreshCw size={14} />
        {isPending
          ? 'Triggering...'
          : cooldown
            ? `Sync on cooldown (${remainingMinutes}m remaining)`
            : 'Trigger Sync Now'}
      </button>
    </div>
  )
}

interface DiscoveredOrg {
  login: string
  github_id: number
  avatar_url: string
  connected: boolean
}

function ConnectOrgTab() {
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error } = useQuery<{ organizations: DiscoveredOrg[] }>({
    queryKey: ['github-discover'],
    queryFn: () => apiGet<{ organizations: DiscoveredOrg[] }>('/github/discover'),
    staleTime: 30_000,
  })

  const connectMutation = useMutation<unknown, ApiError, string>({
    mutationFn: async (orgLogin: string) => {
      const res = await apiCall('/github/connect-pat', {
        method: 'POST',
        body: JSON.stringify({ orgLogin }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }))
        throw new ApiError(res.status, err.message ?? 'Failed to connect')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github-discover'] })
      queryClient.invalidateQueries({ queryKey: ['orgs'] })
      queryClient.invalidateQueries({ queryKey: ['health'] })
    },
  })

  const orgs = data?.organizations ?? []

  return (
    <div className="max-w-xl">
      <div className="border border-border/40 rounded-lg bg-card p-5 mb-4">
        <h3 className="text-base font-semibold text-foreground mb-1">Connect Organization</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select a GitHub organization to connect. This will start an initial data sync
          (repos, PRs, reviews, deployments) from the last 90 days.
        </p>

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 size={14} className="animate-spin" />
            Discovering organizations from your GitHub token...
          </div>
        )}

        {isError && (
          <div className="border-l-2 border-red-500 bg-red-500/10 text-red-400 p-3 rounded mb-3 text-sm">
            {(error as ApiError)?.message ?? 'Failed to discover organizations. Check your GITHUB_PAT.'}
          </div>
        )}

        {connectMutation.isSuccess && (
          <div className="border-l-2 border-green-500 bg-green-500/10 text-green-400 p-3 rounded mb-3 text-sm">
            Organization connected. Initial sync has been queued — data will appear within a few minutes.
          </div>
        )}

        {connectMutation.isError && (
          <div className="border-l-2 border-red-500 bg-red-500/10 text-red-400 p-3 rounded mb-3 text-sm">
            {connectMutation.error?.message ?? 'Failed to connect organization.'}
          </div>
        )}

        {!isLoading && orgs.length === 0 && !isError && (
          <p className="text-sm text-muted-foreground py-2">
            No organizations found. Make sure your GitHub PAT has access to at least one organization.
          </p>
        )}

        <div className="space-y-2">
          {orgs.map((org) => (
            <div
              key={org.github_id}
              className="flex items-center justify-between border border-border/40 rounded-lg p-3"
            >
              <div className="flex items-center gap-3">
                <img
                  src={org.avatar_url}
                  alt={org.login}
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-sm font-medium text-foreground">{org.login}</span>
              </div>
              {org.connected ? (
                <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                  <Check size={12} />
                  Connected
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => connectMutation.mutate(org.login)}
                  disabled={connectMutation.isPending}
                  className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-medium rounded px-3 py-1.5 disabled:opacity-50 transition-colors"
                >
                  {connectMutation.isPending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Plus size={12} />
                  )}
                  Connect
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const TAB_SLUGS = ['connect', 'overview', 'sync-history', 'webhooks', 'manual-sync'] as const
type TabSlug = (typeof TAB_SLUGS)[number]
const TAB_LABELS: Record<TabSlug, string> = {
  'connect': 'Connect Org',
  'overview': 'Overview',
  'sync-history': 'Sync History',
  'webhooks': 'Webhooks',
  'manual-sync': 'Manual Sync',
}

export default function AdminPage() {
  const { isAdmin } = useAuth()
  const { data: health, isLoading: healthLoading } = useHealth()
  const [tab, setTab] = useQueryState('tab', parseAsString.withDefault('connect'))

//   if (!isAdmin) {
//     return (
//       <>
//         <Header title="Admin — Observability" />
//         <div className="mt-24 flex items-center justify-center gap-2">
//           <Lock size={16} className="text-red-400" />
//           <p className="text-sm text-red-400">
//             Admin access required. Contact your administrator to request access.
//           </p>
//         </div>
//       </>
//     )
//   }

  const activeTab = TAB_SLUGS.includes((tab as TabSlug)) ? (tab as TabSlug) : 'overview'

  return (
    <>
      <Header
        title="Admin — Observability"
        rightSlot={<SyncStatusBadge health={health} loading={healthLoading} />}
      />
      <div>
        {/* Tabs */}
        <div className="flex border-b border-border mb-4">
          {TAB_SLUGS.map((slug) => (
            <button
              key={slug}
              type="button"
              onClick={() => setTab(slug)}
              className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-[2px] ${
                activeTab === slug
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {TAB_LABELS[slug]}
            </button>
          ))}
        </div>

        {activeTab === 'connect' && <ConnectOrgTab />}
        {activeTab === 'overview' && <OverviewTab health={health} isLoading={healthLoading} />}
        {activeTab === 'sync-history' && <SyncHistoryTable />}
        {activeTab === 'webhooks' && <WebhookDLQTable />}
        {activeTab === 'manual-sync' && <ManualSyncTab health={health} healthLoading={healthLoading} />}
      </div>
    </>
  )
}
