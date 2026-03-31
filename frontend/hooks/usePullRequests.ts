import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useFilterParams } from './useFilterParams'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import type { PaginatedResponse, PullRequest } from '@/lib/types'

interface PullRequestsOptions {
  sortBy?: string
  sortDir?: 'ASC' | 'DESC'
}

export function usePullRequests(orgId: string, options: PullRequestsOptions = {}) {
  const {
    startDate, endDate,
    repoId, developerId,
    state, branch,
    page,
  } = useFilterParams()

  const start = startDate.toISOString().split('T')[0]
  const end = endDate.toISOString().split('T')[0]
  const offset = (parseInt(page ?? '0', 10)) * DEFAULT_PAGE_SIZE
  const sortBy = options.sortBy ?? 'github_created_at'
  const sortDir = options.sortDir ?? 'DESC'

  const params = new URLSearchParams({
    org_id: orgId,
    start_date: start,
    end_date: end,
    limit: String(DEFAULT_PAGE_SIZE),
    offset: String(offset),
    sort_by: sortBy,
    sort_dir: sortDir,
  })

  if (repoId) params.set('repo_id', repoId)
  if (developerId) params.set('developer_id', developerId)
  if (state) params.set('state', state)
  if (branch) params.set('branch', branch)

  return useQuery<PaginatedResponse<PullRequest>>({
    queryKey: ['pull-requests', orgId, start, end, repoId, developerId, state, branch, page, sortBy, sortDir],
    queryFn: () =>
      apiGet<PaginatedResponse<PullRequest>>(
        `/api/v1/pull-requests?${params.toString()}`
      ),
    enabled: !!orgId,
    placeholderData: (previousData) => previousData, // Keep previous page visible during transition
  })
}
