'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import type { TrendDataPoint } from '@/lib/types'

interface DeveloperTrendChartProps {
  data: TrendDataPoint[]
  loading?: boolean
}

interface WeeklyRow {
  week_start: string
  pr_count: number
}

function getMonday(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getUTCDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

function formatWeekLabel(isoDate: string): string {
  const d = new Date(isoDate)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function aggregateToWeekly(data: TrendDataPoint[]): WeeklyRow[] {
  const weekly = new Map<string, number>()
  for (const point of data) {
    if (point.metric_key !== 'prs_opened_total') continue
    const monday = getMonday(point.date)
    weekly.set(monday, (weekly.get(monday) ?? 0) + point.value)
  }
  return Array.from(weekly.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week_start, pr_count]) => ({
      week_start: formatWeekLabel(week_start),
      pr_count,
    }))
}

export function DeveloperTrendChart({ data, loading = false }: DeveloperTrendChartProps) {
  if (loading) {
    return <div className="animate-pulse bg-muted rounded h-[240px]" />
  }

  const chartData = aggregateToWeekly(data)

  if (chartData.length === 0) {
    return (
      <div className="h-[240px] flex items-center justify-center border border-border/40 rounded">
        <p className="text-muted-foreground text-sm">No PR data for the last 90 days.</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm font-semibold text-foreground mb-2 tracking-tight">
        PR Activity — Last 90 Days (Weekly)
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
          <XAxis
            dataKey="week_start"
            tick={{ fontSize: 11, fill: '#64748b' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#13131a', borderColor: 'rgba(255,255,255,0.07)', color: '#f1f5f9' }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [value, 'PRs']}
          />
          <Bar dataKey="pr_count" fill="#6366f1" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
