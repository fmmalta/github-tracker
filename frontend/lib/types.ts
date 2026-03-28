// Metric types
export type MetricKey =
  | 'PRS_OPENED_TOTAL'
  | 'PRS_MERGED_TOTAL'
  | 'PRS_CLOSED_WITHOUT_MERGE_TOTAL'
  | 'AVG_TIME_TO_FIRST_REVIEW_HOURS'
  | 'AVG_TIME_TO_MERGE_HOURS'
  | 'TOTAL_ADDITIONS'
  | 'TOTAL_DELETIONS'
  | 'TOTAL_CHANGED_FILES'
  | 'REVIEWS_SUBMITTED_TOTAL'
  | 'AVG_PR_SIZE'

export interface MetricDefinition {
  key: MetricKey
  name: string
  formula: string
  unit: string
  disclaimer: string
}

export interface AggregatedMetric {
  metric_key: MetricKey
  total: number
  definition: MetricDefinition
}

export interface LeaderboardEntry {
  developer_id: string
  developer_login: string
  developer_name: string | null
  metric_key: MetricKey
  total: number
  rank: number
}

export interface TrendDataPoint {
  date: string      // ISO date string YYYY-MM-DD
  metric_key: MetricKey
  value: number
}

export interface HealthStatus {
  status: 'ok' | 'degraded'
  queue: {
    pending: number
    active: number
    delayed: number
    failed: number
  }
  last_sync: string | null
  last_metrics_aggregation: string | null
}

// Data types
export interface Repository {
  id: string
  github_id: number
  name: string
  full_name: string
  org_id: string
  created_at: string
  updated_at: string
}

export interface Developer {
  id: string
  github_id: number
  login: string
  name: string | null
  avatar_url: string | null
}

export type PullRequestState = 'open' | 'closed' | 'merged'

export interface PullRequest {
  id: string
  github_id: number
  number: number
  title: string
  state: PullRequestState
  developer_id: string
  developer_login: string
  repo_id: string
  repo_full_name: string
  base_branch: string
  additions: number
  deletions: number
  changed_files: number
  github_created_at: string
  github_merged_at: string | null
  github_closed_at: string | null
  review_count: number
}

// API response wrappers
export interface PaginatedResponse<T> {
  data: T[]
  total: number
}

export interface MetricsResponse {
  data: AggregatedMetric[]
  definitions: MetricDefinition[]
}

export interface LeaderboardResponse {
  data: LeaderboardEntry[]
  definitions: MetricDefinition[]
}

export interface TrendsResponse {
  data: TrendDataPoint[]
  definitions: MetricDefinition[]
}

// Auth types
export interface AuthUser {
  id: string
  email: string
  role: 'admin' | 'manager' | 'viewer'
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}
