'use client'
import { useState } from 'react'
import { useSyncHistory } from '@/hooks/useSyncHistory'
import type { SyncJob } from '@/lib/types'

function StatusBadge({ status }: { status: SyncJob['status'] }) {
  const map: Record<SyncJob['status'], { label: string; cls: string }> = {
    success: { label: 'Success', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
    failed: { label: 'Failed', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
    in_progress: { label: 'In Progress', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    pending: { label: 'Pending', cls: 'bg-muted/40 text-muted-foreground border-border' },
  }
  const cfg = map[status] ?? map.pending
  return (
    <span className={`inline-flex items-center text-xs border rounded px-1.5 py-0.5 ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function TypeBadge({ type }: { type: SyncJob['type'] }) {
  const map: Record<SyncJob['type'], { label: string; cls: string }> = {
    initial_backfill: { label: 'Initial Backfill', cls: 'text-indigo-300 border-indigo-500/30' },
    scheduled: { label: 'Scheduled', cls: 'text-muted-foreground border-border' },
    manual: { label: 'Manual', cls: 'text-primary border-primary/30' },
  }
  const cfg = map[type] ?? map.scheduled
  return (
    <span className={`inline-flex items-center text-xs border rounded px-1.5 py-0.5 ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

const PAGE_SIZE = 50

export function SyncHistoryTable() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError } = useSyncHistory(page)

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-1">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-13 bg-muted rounded" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="border-l-2 border-red-500 bg-red-500/10 text-red-400 p-3 rounded mb-2 text-sm">
        Failed to load sync history.
      </div>
    )
  }

  const rows = data?.data ?? []

  if (rows.length === 0 && page === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm font-semibold text-muted-foreground">No sync jobs recorded yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Syncs appear here after the first connection.</p>
      </div>
    )
  }

  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {['Type', 'Status', 'Started', 'Finished', 'Repos', 'Error', 'Retries'].map((h) => (
                <th key={h} className="text-left text-xs text-muted-foreground font-medium py-2 px-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((job) => (
              <tr key={job.id} className="border-b border-border/50 hover:bg-white/[0.02]">
                <td className="py-2 px-3"><TypeBadge type={job.type} /></td>
                <td className="py-2 px-3"><StatusBadge status={job.status} /></td>
                <td className="py-2 px-3 text-xs text-foreground">{formatDate(job.started_at)}</td>
                <td className="py-2 px-3 text-xs text-foreground">{formatDate(job.finished_at)}</td>
                <td className="py-2 px-3 text-xs text-foreground">{job.repos_synced}</td>
                <td className="py-2 px-3 max-w-[200px]">
                  {job.error_message ? (
                    <span
                      title={job.error_message}
                      className="text-xs text-red-400 cursor-help truncate block max-w-[200px]"
                    >
                      {job.error_message.slice(0, 60)}{job.error_message.length > 60 ? '…' : ''}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-2 px-3 text-xs text-foreground">{job.retry_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-border text-xs text-muted-foreground">
          <span>{total} total</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="px-2 py-1 border border-border rounded disabled:opacity-40 hover:text-foreground transition-colors"
            >
              Prev
            </button>
            <span className="px-2 py-1">Page {page + 1} of {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              className="px-2 py-1 border border-border rounded disabled:opacity-40 hover:text-foreground transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
