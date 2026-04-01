'use client'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { apiGet } from '@/lib/api-client'

interface ReadmeSectionProps {
  orgId: string | null
  repoId: string
}

export function ReadmeSection({ orgId, repoId }: ReadmeSectionProps) {
  const { data, isLoading, isError } = useQuery<{ content: string }>({
    queryKey: ['repo-readme', orgId, repoId],
    queryFn: () => apiGet<{ content: string }>(`/api/v1/orgs/${orgId}/repos/${repoId}/readme`),
    enabled: !!orgId && !!repoId,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="mt-6 border border-border rounded-lg p-6 bg-card/50">
        <div className="h-4 w-24 bg-muted-foreground/10 rounded animate-pulse mb-4" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-muted-foreground/10 rounded animate-pulse" />
          <div className="h-3 w-3/4 bg-muted-foreground/10 rounded animate-pulse" />
          <div className="h-3 w-5/6 bg-muted-foreground/10 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (isError || !data?.content) return null

  return (
    <div className="mt-6 border border-border rounded-lg p-6 bg-card/50">
      <h3 className="text-sm font-semibold text-foreground mb-4">README</h3>
      <div className="prose prose-invert prose-sm max-w-none
        prose-headings:text-foreground prose-headings:font-semibold
        prose-p:text-muted-foreground prose-p:leading-relaxed
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        prose-strong:text-foreground
        prose-code:text-primary/90 prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
        prose-pre:bg-[#0a0a0f] prose-pre:border prose-pre:border-border prose-pre:rounded-lg
        prose-blockquote:border-primary/30 prose-blockquote:text-muted-foreground
        prose-li:text-muted-foreground
        prose-hr:border-border
        prose-th:text-foreground prose-td:text-muted-foreground
        prose-img:rounded-lg
      ">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {data.content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
