'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiCall, ApiError } from '@/lib/api-client'

export function useWebhookRetry() {
  const queryClient = useQueryClient()

  return useMutation<{ ok: boolean }, ApiError, string>({
    mutationFn: async (deliveryId: string) => {
      const res = await apiCall(`/api/v1/admin/webhook-dlq/${deliveryId}/retry`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }))
        throw new ApiError(res.status, err.message ?? 'Retry failed')
      }
      return res.json() as Promise<{ ok: boolean }>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-dlq'] })
    },
  })
}
