import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiCall, ApiError } from '@/lib/api-client'
import { useFirstOrgId } from './useOrgs'

interface SyncResult {
  message: string
}

export function useAdminSync() {
  const queryClient = useQueryClient()
  const orgId = useFirstOrgId()

  const mutation = useMutation<SyncResult, ApiError, void>({
    mutationFn: async () => {
      const res = await apiCall('/github/sync', {
        method: 'POST',
        body: JSON.stringify({ org_id: orgId }),
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
