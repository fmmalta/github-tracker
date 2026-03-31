'use client'
import Link from 'next/link'
import { Header } from '@/components/dashboard/Header'
import { DisclaimerBanner } from '@/components/common/DisclaimerBanner'
import { FilterPanel } from '@/components/dashboard/FilterPanel'
import { TableSkeleton } from '@/components/dashboard/LoadingSkeletons'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useFilterParams } from '@/hooks/useFilterParams'
import { useFirstOrgId } from '@/hooks/useOrgs'
import { formatHoursToFriendly } from '@/lib/utils'
import { LEADERBOARD_DISCLAIMER } from '@/lib/constants'
import type { MetricKey } from '@/lib/types'

const SELECTABLE_METRICS: { key: MetricKey; label: string }[] = [
  { key: 'prs_merged', label: 'PRs Merged' },
  { key: 'prs_opened', label: 'PRs Opened' },
  { key: 'reviews_submitted', label: 'Reviews Submitted' },
  { key: 'avg_time_to_merge_hours', label: 'Avg Time to Merge' },
  { key: 'additions', label: 'Lines Added' },
]

export default function LeaderboardPage() {
  const orgId = useFirstOrgId()
  const { metric, setMetric } = useFilterParams()
  const currentMetric = (metric ?? 'prs_merged') as MetricKey
  const { data, isLoading } = useLeaderboard(orgId)

  const currentDefinition = data?.definitions?.find((d) => d.key === currentMetric)
  const rows = data?.data ?? []

  return (
    <>
      <Header title="Developer Leaderboard" />
      <div>
        <DisclaimerBanner
          message={LEADERBOARD_DISCLAIMER}
          variant="warning"
          id="leaderboard-disclaimer"
        />

        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Rank developers by</label>
            <select
              className="text-sm bg-background border border-border rounded px-2 py-1.5 text-foreground min-w-[200px]"
              value={currentMetric}
              onChange={(e) => setMetric(e.target.value)}
              aria-label="Select metric for ranking"
            >
              {SELECTABLE_METRICS.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>

          {currentDefinition && (
            <span className="text-xs border border-border rounded px-2 py-1 text-muted-foreground max-w-[400px] truncate">
              {currentDefinition.formula}
            </span>
          )}
        </div>

        <FilterPanel />

        {isLoading ? (
          <TableSkeleton rows={10} />
        ) : (
          <div
            className="border border-border rounded-lg overflow-hidden"
            role="region"
            aria-label="Developer leaderboard"
            aria-describedby="leaderboard-disclaimer"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="text-center text-xs text-muted-foreground font-medium py-2 px-3 w-12">#</th>
                  <th className="text-left text-xs text-muted-foreground font-medium py-2 px-4">Developer</th>
                  <th className="text-right text-xs text-muted-foreground font-medium py-2 px-4">
                    {SELECTABLE_METRICS.find((m) => m.key === currentMetric)?.label ?? 'Value'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <tr key={entry.developer_id} className="border-b border-border/50 hover:bg-white/[0.02]">
                    <td className="py-2 px-3 text-center text-sm text-muted-foreground">{entry.rank}</td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/developers/${entry.developer_id}`}
                          className="text-sm font-medium text-foreground hover:text-primary hover:underline transition-colors"
                        >
                          {entry.developer_login}
                        </Link>
                        {entry.developer_name && (
                          <span className="text-xs text-muted-foreground">{entry.developer_name}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-4 text-right">
                      <span className={`text-sm ${entry.rank <= 3 ? 'font-bold text-foreground' : 'font-normal text-foreground'}`}>
                        {currentMetric === 'avg_time_to_merge_hours' && typeof entry.total === 'number'
                          ? formatHoursToFriendly(entry.total)
                          : (typeof entry.total === 'number' ? entry.total.toLocaleString() : entry.total)
                        }
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {currentDefinition && (
          <div className="mt-3 p-3 bg-card/50 rounded border border-border/50">
            <p className="text-xs text-muted-foreground">
              <strong>About this metric:</strong> {currentDefinition.disclaimer}
            </p>
          </div>
        )}
      </div>
    </>
  )
}

export const dynamic = 'force-dynamic'
