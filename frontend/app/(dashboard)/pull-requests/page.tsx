'use client'
import { useState } from 'react'
import { Header } from '@/components/dashboard/Header'
import { FilterPanel } from '@/components/dashboard/FilterPanel'
import { TableSkeleton } from '@/components/dashboard/LoadingSkeletons'
import { usePullRequests } from '@/hooks/usePullRequests'
import { useRepositories } from '@/hooks/useRepositories'
import { useDevelopers } from '@/hooks/useDevelopers'
import { useFilterParams } from '@/hooks/useFilterParams'
import { useFirstOrgId } from '@/hooks/useOrgs'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import type { PullRequestState } from '@/lib/types'

const STATE_COLORS: Record<PullRequestState, string> = {
  open: 'text-blue-400 border-blue-500/30',
  merged: 'text-green-400 border-green-500/30',
  closed: 'text-muted-foreground border-border',
}

type SortField = 'number' | 'github_created_at' | 'github_merged_at' | 'additions' | 'deletions'
type SortDir = 'ASC' | 'DESC'

const SORTABLE_FIELD_MAP: Record<SortField, string> = {
  number: 'number',
  github_created_at: 'github_created_at',
  github_merged_at: 'github_merged_at',
  additions: 'additions',
  deletions: 'deletions',
}

export default function PullRequestsPage() {
  const orgId = useFirstOrgId()
  const { page, setPage } = useFilterParams()
  const currentPage = parseInt(page ?? '0', 10)

  const [sortField, setSortField] = useState<SortField>('github_created_at')
  const [sortDir, setSortDir] = useState<SortDir>('DESC')

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir(sortDir === 'ASC' ? 'DESC' : 'ASC')
    } else {
      setSortField(field)
      setSortDir('DESC')
      setPage('0')
    }
  }

  const { data: prData, isLoading: prLoading } = usePullRequests(orgId, {
    sortBy: SORTABLE_FIELD_MAP[sortField] ?? 'github_created_at',
    sortDir,
  })

  const { data: reposData } = useRepositories(orgId)
  const { data: devsData } = useDevelopers(orgId)

  const rowCount = prData?.total ?? 0
  const rows = prData?.data ?? []
  const totalPages = Math.ceil(rowCount / DEFAULT_PAGE_SIZE)

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (field !== sortField) return <span className="text-muted-foreground/40 ml-1">↕</span>
    return <span className="text-primary ml-1">{sortDir === 'ASC' ? '↑' : '↓'}</span>
  }

  return (
    <>
      <Header title="Pull Request Explorer" />
      <div>
        <FilterPanel
          repos={reposData?.data}
          developers={devsData?.data}
          showStateFilter
          showBranchFilter
        />

        <p className="text-sm text-muted-foreground mb-2">
          {rowCount.toLocaleString()} pull requests found
        </p>

        {prLoading && !prData ? (
          <TableSkeleton rows={10} />
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-card">
                    <th
                      className="text-left text-xs text-muted-foreground font-medium py-2 px-3 cursor-pointer hover:text-foreground w-16"
                      onClick={() => handleSort('number')}
                    >
                      PR # <SortIndicator field="number" />
                    </th>
                    <th className="text-left text-xs text-muted-foreground font-medium py-2 px-3">Title</th>
                    <th className="text-left text-xs text-muted-foreground font-medium py-2 px-3">Repository</th>
                    <th className="text-left text-xs text-muted-foreground font-medium py-2 px-3">Developer</th>
                    <th className="text-left text-xs text-muted-foreground font-medium py-2 px-3 w-20">State</th>
                    <th
                      className="text-left text-xs text-muted-foreground font-medium py-2 px-3 cursor-pointer hover:text-foreground w-24"
                      onClick={() => handleSort('github_created_at')}
                    >
                      Created <SortIndicator field="github_created_at" />
                    </th>
                    <th
                      className="text-left text-xs text-muted-foreground font-medium py-2 px-3 cursor-pointer hover:text-foreground w-24"
                      onClick={() => handleSort('github_merged_at')}
                    >
                      Merged <SortIndicator field="github_merged_at" />
                    </th>
                    <th
                      className="text-right text-xs text-muted-foreground font-medium py-2 px-3 cursor-pointer hover:text-foreground w-20"
                      onClick={() => handleSort('additions')}
                    >
                      +Lines <SortIndicator field="additions" />
                    </th>
                    <th
                      className="text-right text-xs text-muted-foreground font-medium py-2 px-3 cursor-pointer hover:text-foreground w-20"
                      onClick={() => handleSort('deletions')}
                    >
                      -Lines <SortIndicator field="deletions" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((pr) => (
                    <tr key={pr.id} className="border-b border-border/50 hover:bg-white/[0.02]">
                      <td className="py-2 px-3 text-xs text-primary">#{pr.number}</td>
                      <td className="py-2 px-3 max-w-[200px]">
                        <span className="text-xs text-foreground truncate block" title={pr.title}>{pr.title}</span>
                      </td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">
                        {reposData?.data.find((r) => r.id === pr.repository_id)?.name ?? pr.repository_id}
                      </td>
                      <td className="py-2 px-3 text-xs text-foreground">{pr.author_login}</td>
                      <td className="py-2 px-3">
                        <span className={`text-xs border rounded px-1.5 py-0.5 ${STATE_COLORS[pr.state as PullRequestState] ?? STATE_COLORS.closed}`}>
                          {pr.state}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">
                        {pr.github_created_at ? new Date(pr.github_created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">
                        {pr.github_merged_at ? new Date(pr.github_merged_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-2 px-3 text-xs text-right text-green-400">
                        +{pr.additions?.toLocaleString() ?? 0}
                      </td>
                      <td className="py-2 px-3 text-xs text-right text-red-400">
                        -{pr.deletions?.toLocaleString() ?? 0}
                      </td>
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
                    className="px-2 py-1 border border-border rounded disabled:opacity-40 hover:text-foreground transition-colors"
                  >
                    Prev
                  </button>
                  <span className="px-2 py-1">Page {currentPage + 1} of {totalPages}</span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages - 1}
                    onClick={() => setPage(String(currentPage + 1))}
                    className="px-2 py-1 border border-border rounded disabled:opacity-40 hover:text-foreground transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
