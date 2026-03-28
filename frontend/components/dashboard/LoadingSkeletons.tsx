import { Card, CardContent, Skeleton, Box, Grid } from '@mui/material'

export function MetricCardSkeleton() {
  return (
    <Card>
      <CardContent>
        <Skeleton variant="text" width="70%" />
        <Skeleton variant="rectangular" height={48} sx={{ my: 1, borderRadius: 0.5 }} />
        <Skeleton variant="text" width="40%" />
      </CardContent>
    </Card>
  )
}

export function MetricGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(250px, 1fr))" gap={2}>
      {Array.from({ length: count }).map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </Box>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Box>
      <Skeleton variant="rectangular" height={52} sx={{ mb: 1, borderRadius: 0.5 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rectangular" height={44} sx={{ mb: 0.5, borderRadius: 0.5 }} />
      ))}
    </Box>
  )
}

export function ChartSkeleton() {
  return <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
}
