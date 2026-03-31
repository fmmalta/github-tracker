import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import type { PaginatedResponse, Developer } from '@/lib/types'

export function useDevelopers(orgId: string, limit = 200) {
  return useQuery<PaginatedResponse<Developer>>({
    queryKey: ['developers', orgId, limit],
    queryFn: () =>
      apiGet<PaginatedResponse<Developer>>(
        `/api/v1/orgs/${orgId}/developers?limit=${limit}&sort_by=login&sort_dir=ASC`
      ),
    enabled: !!orgId,
  })
}
