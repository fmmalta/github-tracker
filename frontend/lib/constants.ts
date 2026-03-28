// Date range presets
export const DATE_PRESETS = [
  {
    label: 'Last 7 days',
    getDates: () => ({
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    }),
  },
  {
    label: 'Last 30 days',
    getDates: () => ({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    }),
  },
  {
    label: 'Last 90 days',
    getDates: () => ({
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    }),
  },
] as const

export const DEFAULT_PAGE_SIZE = 50

export const METRIC_NEUTRAL_DISCLAIMER =
  'These metrics reflect GitHub activity patterns, not engineering value or productivity.'

export const LEADERBOARD_DISCLAIMER =
  'Not a productivity ranking. Metrics show GitHub activity patterns.'

// Default org ID — loaded from env or first org available
export const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ?? ''
