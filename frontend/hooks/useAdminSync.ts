import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiCall, ApiError } from '@/lib/api-client'
import { DEFAULT_ORG_ID } from '@/lib/constants'

interface SyncResult {
  message: string
}

export function useAdminSync() {
  const queryClient = useQueryClient()

  const mutation = useMutation<SyncResult, ApiError, void>({
    mutationFn: async () => {
      const res = await apiCall('/api/v1/github/sync', {
        method: 'POST',
        body: JSON.stringify({ org_id: DEFAULT_ORG_ID }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }))
        throw new ApiError(res.status, err.message ?? 'Sync failed')
      }
      return res.json() as Promise<SyncResult>
    },
    onSuccess: () => {
      // Refresh health status after successful sync trigger
      queryClient.invalidateQueries({ queryKey: ['health'] })
    },
  })

  return mutation
}
