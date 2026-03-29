export function MetricCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 animate-pulse">
      <div className="h-4 bg-muted rounded w-[70%] mb-3" />
      <div className="h-12 bg-muted rounded w-[50%] mb-3" />
      <div className="h-3 bg-muted rounded w-[40%]" />
    </div>
  )
}

export function MetricGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      <div className="h-13 bg-muted rounded mb-1" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-11 bg-muted/60 rounded mb-0.5" />
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return <div className="animate-pulse bg-muted rounded h-[300px]" />
}
