'use client'
import type { DeveloperReview } from '@/lib/types'

interface ReviewHistoryTableProps {
  reviews: DeveloperReview[]
  isLoading: boolean
  isError: boolean
}

function ReviewStateBadge({ state }: { state: DeveloperReview['state'] }) {
  const map: Record<DeveloperReview['state'], { label: string; cls: string }> = {
    approved: { label: 'Approved', cls: 'text-green-400 border-green-500/30' },
    changes_requested: { label: 'Changes Requested', cls: 'text-red-400 border-red-500/30' },
    commented: { label: 'Commented', cls: 'text-muted-foreground border-border' },
    dismissed: { label: 'Dismissed', cls: 'text-muted-foreground border-border' },
  }
  const cfg = map[state] ?? map.commented
  return (
    <span className={`inline-flex items-center text-xs border rounded px-1.5 py-0.5 ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
}

export function ReviewHistoryTable({ reviews, isLoading, isError }: ReviewHistoryTableProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-1">
        {[...Array(8)].map((_, i) => <div key={i} className="h-13 bg-muted rounded" />)}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="border-l-2 border-red-500 bg-red-500/10 text-red-400 p-3 rounded text-sm">
        Failed to load review history.
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No reviews recorded for this developer in the available data range.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {['PR Title', 'Repo', 'Branch', 'Review State', 'Date Reviewed'].map((h) => (
              <th key={h} className="text-left text-xs text-muted-foreground font-medium py-2 px-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {reviews.map((review) => (
            <tr key={review.id} className="border-b border-border/50 hover:bg-white/[0.02]">
              <td className="py-2 px-3 max-w-[300px]">
                <span
                  className="text-xs text-foreground truncate block max-w-[280px]"
                  title={review.pr_title}
                >
                  #{review.pr_number} {review.pr_title}
                </span>
              </td>
              <td className="py-2 px-3 text-xs text-muted-foreground">{review.repo_name}</td>
              <td className="py-2 px-3 text-xs text-muted-foreground">{review.base_branch}</td>
              <td className="py-2 px-3"><ReviewStateBadge state={review.state} /></td>
              <td className="py-2 px-3 text-xs text-foreground">{formatDate(review.date_reviewed)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
