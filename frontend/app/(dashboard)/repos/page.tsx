'use client'
import Link from 'next/link'
import { Header } from '@/components/dashboard/Header'
import { TableSkeleton } from '@/components/dashboard/LoadingSkeletons'
import { useRepositories } from '@/hooks/useRepositories'
import { useFirstOrgId } from '@/hooks/useOrgs'

export default function ReposPage() {
  const orgId = useFirstOrgId()
  const { data, isLoading } = useRepositories(orgId)
  const repos = data?.data ?? []

  return (
    <>
      <Header title="Repositories" />
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          {data?.total ?? 0} repositories in organization
        </p>

        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="text-left text-xs text-muted-foreground font-medium py-2 px-4">Repository</th>
                  <th className="text-left text-xs text-muted-foreground font-medium py-2 px-4">Full Name</th>
                  <th className="text-left text-xs text-muted-foreground font-medium py-2 px-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {repos.map((repo) => (
                  <tr key={repo.id} className="border-b border-border/50 hover:bg-white/[0.02]">
                    <td className="py-2 px-4">
                      <Link
                        href={`/repos/${repo.id}`}
                        className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {repo.name}
                      </Link>
                    </td>
                    <td className="py-2 px-4 text-sm text-muted-foreground">{repo.full_name}</td>
                    <td className="py-2 px-4 text-sm text-muted-foreground">
                      {new Date(repo.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

export const dynamic = 'force-dynamic'
