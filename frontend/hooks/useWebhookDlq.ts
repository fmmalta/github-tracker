'use client'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import type { WebhookDelivery, PaginatedResponse } from '@/lib/types'

export function useWebhookDlq(page: number = 0) {
  const offset = page * 50
  return useQuery<PaginatedResponse<WebhookDelivery>>({
    queryKey: ['webhook-dlq', page],
    queryFn: () =>
      apiGet<PaginatedResponse<WebhookDelivery>>(`/api/v1/admin/webhook-dlq?limit=50&offset=${offset}`),
    staleTime: 30 * 1000,
  })
}
