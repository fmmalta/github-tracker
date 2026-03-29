'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
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
    if (point.metric_key === 'prs_opened_total') existing.opened = point.value
    if (point.metric_key === 'prs_merged_total') existing.merged = point.value
    byDate.set(point.date, existing)
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export function TrendChart({ data, loading = false, title = 'PR Trend (Opened vs Merged)' }: TrendChartProps) {
  if (loading) {
    return <div className="animate-pulse bg-muted rounded h-[300px]" />
  }

  const chartData = groupTrendData(data)

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No trend data available for the selected period.</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm font-semibold text-foreground mb-2">{title}</p>
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
          <Line type="monotone" dataKey="opened" stroke="#6366f1" strokeWidth={2} dot={false} name="opened" />
          <Line type="monotone" dataKey="merged" stroke="#22c55e" strokeWidth={2} dot={false} name="merged" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
