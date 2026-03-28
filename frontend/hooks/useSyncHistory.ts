'use client'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import type { SyncJob, PaginatedResponse } from '@/lib/types'

export function useSyncHistory(page: number = 0) {
  const offset = page * 50
  return useQuery<PaginatedResponse<SyncJob>>({
    queryKey: ['sync-history', page],
    queryFn: () =>
      apiGet<PaginatedResponse<SyncJob>>(`/api/v1/admin/sync-history?limit=50&offset=${offset}`),
    staleTime: 30 * 1000,
  })
}
