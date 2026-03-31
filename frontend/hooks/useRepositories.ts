import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import type { PaginatedResponse, Repository } from '@/lib/types'

export function useRepositories(orgId: string, limit = 100) {
  return useQuery<PaginatedResponse<Repository>>({
    queryKey: ['repositories', orgId, limit],
    queryFn: () =>
      apiGet<PaginatedResponse<Repository>>(
        `/api/v1/orgs/${orgId}/repos?limit=${limit}&sort_by=name&sort_dir=ASC`
      ),
    enabled: !!orgId,
  })
}
