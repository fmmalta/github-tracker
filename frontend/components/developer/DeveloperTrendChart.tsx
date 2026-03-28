'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { Box, Typography, Skeleton } from '@mui/material'
import type { TrendDataPoint } from '@/lib/types'

interface DeveloperTrendChartProps {
  data: TrendDataPoint[]
  loading?: boolean
}

interface WeeklyRow {
  week_start: string   // "Mar 3", "Mar 10" format for display
  pr_count: number
}

function getMonday(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getUTCDay()
  const diff = (day === 0 ? -6 : 1 - day) // adjust to Monday
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

function formatWeekLabel(isoDate: string): string {
  const d = new Date(isoDate)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function aggregateToWeekly(data: TrendDataPoint[]): WeeklyRow[] {
  // Use only prs_opened_total to show PRs authored per week
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
    return <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 1 }} />
  }

  const chartData = aggregateToWeekly(data)

  if (chartData.length === 0) {
    return (
      <Box
        height={240}
        display="flex"
        alignItems="center"
        justifyContent="center"
        sx={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 1 }}
      >
        <Typography color="text.secondary">No PR data for the last 90 days.</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={600} mb={1} letterSpacing="-0.01em">
        PR Activity — Last 90 Days (Weekly)
      </Typography>
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
    </Box>
  )
}
