'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { Box, Typography, Skeleton } from '@mui/material'
import type { TrendDataPoint } from '@/lib/types'

interface TrendChartProps {
  data: TrendDataPoint[]
  loading?: boolean
  title?: string
}

interface ChartRow {
  date: string
  opened: number
  merged: number
}

function groupTrendData(data: TrendDataPoint[]): ChartRow[] {
  const byDate = new Map<string, ChartRow>()
  for (const point of data) {
    const existing = byDate.get(point.date) ?? { date: point.date, opened: 0, merged: 0 }
    if (point.metric_key === 'PRS_OPENED_TOTAL') existing.opened = point.value
    if (point.metric_key === 'PRS_MERGED_TOTAL') existing.merged = point.value
    byDate.set(point.date, existing)
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export function TrendChart({ data, loading = false, title = 'PR Trend (Opened vs Merged)' }: TrendChartProps) {
  if (loading) {
    return <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
  }

  const chartData = groupTrendData(data)

  if (chartData.length === 0) {
    return (
      <Box height={300} display="flex" alignItems="center" justifyContent="center">
        <Typography color="text.secondary">No trend data available for the selected period.</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={600} mb={1}>{title}</Typography>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: string) => {
              const d = new Date(v)
              return `${d.getMonth() + 1}/${d.getDate()}`
            }}
          />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            formatter={(value) => [value, '']}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend formatter={(value: string) => value === 'opened' ? 'PRs Opened' : 'PRs Merged'} />
          <Line type="monotone" dataKey="opened" stroke="#1976d2" strokeWidth={2} dot={false} name="opened" />
          <Line type="monotone" dataKey="merged" stroke="#2e7d32" strokeWidth={2} dot={false} name="merged" />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  )
}
