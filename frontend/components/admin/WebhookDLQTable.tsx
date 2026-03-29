'use client'
import { useState } from 'react'
import { useWebhookDlq } from '@/hooks/useWebhookDlq'
import { useWebhookRetry } from '@/hooks/useWebhookRetry'
import type { WebhookDelivery } from '@/lib/types'

const PAGE_SIZE = 50

export function WebhookDLQTable() {
  const [page, setPage] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [retryErrorId, setRetryErrorId] = useState<string | null>(null)
  const { data, isLoading, isError } = useWebhookDlq(page)
  const retryMutation = useWebhookRetry()

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-1">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-13 bg-muted/30 rounded" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="border-l-2 border-red-500 bg-red-500/10 text-red-400 p-3 rounded text-sm">
        Failed to load webhook deliveries.
      </div>
    )
  }

  const rows = data?.data ?? []

  if (rows.length === 0 && page === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm font-semibold text-muted-foreground">No failed webhooks.</p>
        <p className="text-xs text-muted-foreground mt-1">All deliveries are processing normally.</p>
      </div>
    )
  }

  const handleRetry = (delivery: WebhookDelivery, e: React.MouseEvent) => {
    e.stopPropagation()
    setRetryErrorId(null)
    retryMutation.mutate(delivery.id, {
      onError: () => setRetryErrorId(delivery.id),
    })
  }

  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      {retryErrorId && (
        <div className="border-l-2 border-red-500 bg-red-500/10 text-red-400 p-3 rounded mb-3 text-sm flex justify-between">
          <span>Retry failed. Try again or contact your system administrator.</span>
          <button type="button" onClick={() => setRetryErrorId(null)} className="ml-2 hover:text-red-200">×</button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {['Delivery ID', 'Event', 'Received', 'Error', 'Retries', 'Action'].map((h) => (
                <th key={h} className="text-left text-xs text-muted-foreground font-medium py-2 px-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((delivery) => (
              <>
                <tr
                  key={delivery.id}
                  onClick={() => setExpandedId(expandedId === delivery.id ? null : delivery.id)}
                  className="border-b border-border/50 hover:bg-white/[0.02] cursor-pointer"
                >
                  <td className="py-2 px-3 font-mono text-xs">
                    {delivery.delivery_id.slice(0, 16)}…
                  </td>
                  <td className="py-2 px-3 text-xs text-foreground">{delivery.event_type}</td>
                  <td className="py-2 px-3 text-xs text-foreground">
                    {new Date(delivery.received_at).toLocaleString()}
                  </td>
                  <td className="py-2 px-3 max-w-[200px]">
                    {delivery.error_message ? (
                      <span
                        title={delivery.error_message}
                        className="text-xs text-red-400 cursor-help truncate block max-w-[200px]"
                      >
                        {delivery.error_message.slice(0, 60)}{delivery.error_message.length > 60 ? '…' : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-xs text-foreground">{delivery.retry_count}</td>
                  <td className="py-2 px-3">
                    <button
                      type="button"
                      disabled={
                        retryMutation.isPending && retryMutation.variables === delivery.id
                      }
                      onClick={(e) => handleRetry(delivery, e)}
                      className="text-xs border border-primary text-primary hover:border-primary/80 hover:text-primary/80 rounded px-2 py-1 disabled:opacity-50 transition-colors min-h-[32px]"
                    >
                      {retryMutation.isPending && retryMutation.variables === delivery.id
                        ? 'Retrying...'
                        : 'Retry'}
                    </button>
                  </td>
                </tr>
                {expandedId === delivery.id && (
                  <tr key={`${delivery.id}-expanded`}>
                    <td colSpan={6} className="p-0 bg-[#1a1a24]">
                      <pre
                        className="m-0 p-4 text-xs font-mono text-[#f1f5f9] max-h-[200px] overflow-auto whitespace-pre-wrap break-all"
                      >
                        {JSON.stringify(delivery.payload_json, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </>
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
