'use client'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'

interface Org { id: string; login: string; name: string | null }

export function useOrgs() {
  return useQuery<Org[]>({
    queryKey: ['orgs'],
    queryFn: () => apiGet<Org[]>('/api/v1/orgs'),
    staleTime: 5 * 60 * 1000,
  })
}

export function useFirstOrgId(): string {
  const { data } = useOrgs()
  return data?.[0]?.id ?? ''
}
