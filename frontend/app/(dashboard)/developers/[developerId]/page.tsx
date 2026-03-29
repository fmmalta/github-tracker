'use client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { parseAsString, useQueryState } from 'nuqs'
import { Header } from '@/components/dashboard/Header'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { FilterPanel } from '@/components/dashboard/FilterPanel'
import { MetricGridSkeleton, TableSkeleton } from '@/components/dashboard/LoadingSkeletons'
import { DisclaimerBanner } from '@/components/common/DisclaimerBanner'
import { DeveloperTrendChart } from '@/components/developer/DeveloperTrendChart'
import { ReviewHistoryTable } from '@/components/developer/ReviewHistoryTable'
import { useDeveloperMetrics } from '@/hooks/useDeveloperMetrics'
import { usePullRequests } from '@/hooks/usePullRequests'
import { useFilterParams } from '@/hooks/useFilterParams'
import { useFirstOrgId } from '@/hooks/useOrgs'
import { useDeveloperTrends } from '@/hooks/useDeveloperTrends'
import { useDeveloperReviews } from '@/hooks/useDeveloperReviews'
import { METRIC_NEUTRAL_DISCLAIMER, DEFAULT_PAGE_SIZE } from '@/lib/constants'
import type { AggregatedMetric, PullRequestState } from '@/lib/types'

const FEATURED_DEV_METRICS = [
  'prs_opened',
  'prs_merged',
  'avg_time_to_merge_hours',
  'reviews_submitted',
]

const TAB_SLUGS = ['overview', 'prs', 'reviews'] as const
type TabSlug = (typeof TAB_SLUGS)[number]
const TAB_LABELS: Record<TabSlug, string> = {
  overview: 'Overview',
  prs: 'PRs',
  reviews: 'Reviews',
}

const PR_STATE_COLORS: Record<PullRequestState, string> = {
  open: 'text-blue-400 border-blue-500/30',
  merged: 'text-green-400 border-green-500/30',
  closed: 'text-muted-foreground border-border',
}

export default function DeveloperDetailPage() {
  const { developerId } = useParams<{ developerId: string }>()
  const orgId = useFirstOrgId()
  const router = useRouter()
  const { setDeveloperId, page, setPage } = useFilterParams()

  const [tab, setTab] = useQueryState('tab', parseAsString.withDefault('overview'))
  const activeTab = TAB_SLUGS.includes(tab as TabSlug) ? (tab as TabSlug) : 'overview'

  useEffect(() => {
    setDeveloperId(developerId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [developerId])

  const { data: metricsData, isLoading: metricsLoading } = useDeveloperMetrics(developerId, orgId)
  const { data: prData, isLoading: prLoading } = usePullRequests(orgId)
  const { data: trendsData, isLoading: trendsLoading } = useDeveloperTrends(developerId, orgId ?? undefined)
  const { data: reviewsData, isLoading: reviewsLoading, isError: reviewsError } = useDeveloperReviews(developerId, orgId ?? undefined)

  const featuredMetrics: AggregatedMetric[] = (metricsData?.data ?? []).filter((m) =>
    FEATURED_DEV_METRICS.includes(m.metric_key)
  )
  const currentPage = parseInt(page ?? '0', 10)
  const trendPoints = trendsData?.data ?? []
  const reviews = reviewsData?.data ?? []
  const rowCount = prData?.total ?? 0
  const totalPages = Math.ceil(rowCount / DEFAULT_PAGE_SIZE)

  return (
    <>
      <Header title="Developer Detail" />
      <div>
        <div className="mb-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back to leaderboard
          </button>
        </div>

        <DisclaimerBanner message={METRIC_NEUTRAL_DISCLAIMER} />

        <FilterPanel />

        <h2 className="text-base font-semibold text-foreground mb-3">Developer Metrics</h2>

        {metricsLoading ? (
          <MetricGridSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {featuredMetrics.map((metric) => (
              <MetricCard
                key={metric.metric_key}
                label={metric.definition.name}
                value={metric.total}
                unit={metric.definition.unit !== 'count' ? metric.definition.unit : undefined}
                definition={metric.definition}
              />
            ))}
          </div>
        )}

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

        {activeTab === 'overview' && (
          <DeveloperTrendChart data={trendPoints} loading={trendsLoading} />
        )}

        {activeTab === 'prs' && (
          <>
            <h3 className="text-sm font-semibold text-foreground mb-2">PR History</h3>
            {prLoading && !prData ? (
              <TableSkeleton rows={8} />
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-card">
                        <th className="text-left text-xs text-muted-foreground font-medium py-2 px-3 w-16">PR #</th>
                        <th className="text-left text-xs text-muted-foreground font-medium py-2 px-3">Title</th>
                        <th className="text-left text-xs text-muted-foreground font-medium py-2 px-3">Repository</th>
                        <th className="text-left text-xs text-muted-foreground font-medium py-2 px-3 w-20">State</th>
                        <th className="text-left text-xs text-muted-foreground font-medium py-2 px-3 w-24">Created</th>
                        <th className="text-left text-xs text-muted-foreground font-medium py-2 px-3 w-24">Merged</th>
                        <th className="text-right text-xs text-muted-foreground font-medium py-2 px-3 w-16">+Lines</th>
                        <th className="text-right text-xs text-muted-foreground font-medium py-2 px-3 w-16">-Lines</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(prData?.data ?? []).map((pr) => (
                        <tr key={pr.id} className="border-b border-border/50 hover:bg-white/[0.02]">
                          <td className="py-2 px-3 text-xs text-primary">#{pr.number}</td>
                          <td className="py-2 px-3 max-w-[200px]">
                            <span className="text-xs text-foreground truncate block" title={pr.title}>{pr.title}</span>
                          </td>
                          <td className="py-2 px-3 text-xs text-muted-foreground">{pr.repository_id}</td>
                          <td className="py-2 px-3">
                            <span className={`text-xs border rounded px-1.5 py-0.5 ${PR_STATE_COLORS[pr.state as PullRequestState] ?? PR_STATE_COLORS.closed}`}>
                              {pr.state}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-xs text-muted-foreground">
                            {pr.github_created_at ? new Date(pr.github_created_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-2 px-3 text-xs text-muted-foreground">
                            {pr.github_merged_at ? new Date(pr.github_merged_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-2 px-3 text-xs text-right text-green-400">+{pr.additions?.toLocaleString() ?? 0}</td>
                          <td className="py-2 px-3 text-xs text-right text-red-400">-{pr.deletions?.toLocaleString() ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted-foreground">
                    <span>{rowCount.toLocaleString()} total</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={currentPage === 0}
                        onClick={() => setPage(String(currentPage - 1))}
                        className="px-2 py-1 border border-border rounded disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span className="px-2 py-1">Page {currentPage + 1} of {totalPages}</span>
                      <button
                        type="button"
                        disabled={currentPage >= totalPages - 1}
                        onClick={() => setPage(String(currentPage + 1))}
                        className="px-2 py-1 border border-border rounded disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'reviews' && (
          <ReviewHistoryTable
            reviews={reviews}
            isLoading={reviewsLoading}
            isError={reviewsError}
          />
        )}
      </div>
    </>
  )
}

export const dynamic = 'force-dynamic'
