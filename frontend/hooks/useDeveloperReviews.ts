'use client'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import type { DeveloperReview, PaginatedResponse } from '@/lib/types'

export function useDeveloperReviews(developerId: string | undefined, orgId: string | undefined) {
  return useQuery<PaginatedResponse<DeveloperReview>>({
    queryKey: ['developer-reviews', developerId, orgId],
    queryFn: () =>
      apiGet<PaginatedResponse<DeveloperReview>>(
        `/api/v1/developer-reviews/${developerId}?org_id=${orgId ?? ''}&limit=50&offset=0`,
      ),
    enabled: !!developerId && !!orgId,
    staleTime: 5 * 60 * 1000,
  })
}
