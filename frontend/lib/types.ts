// Metric types
export type MetricKey =
  | 'prs_opened'
  | 'prs_merged'
  | 'prs_closed_unmerged'
  | 'prs_opened_total'
  | 'prs_merged_total'
  | 'avg_time_to_first_review_hours'
  | 'avg_time_to_merge_hours'
  | 'additions'
  | 'deletions'
  | 'changed_files'
  | 'reviews_submitted'
  | 'reviews_submitted_total'
  | 'avg_pr_size'

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
    oldest_pending_age_seconds: number | null
  }
  last_sync: {
    completed_at: string | null
    type: string | null
    status: string | null
  } | null
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
  author_id: string | null
  author_login: string
  repository_id: string
  base_branch: string
  additions: number
  deletions: number
  changed_files: number
  github_created_at: string
  github_merged_at: string | null
  github_closed_at: string | null
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

// Admin observability types
export interface SyncJob {
  id: string
  type: 'initial_backfill' | 'scheduled' | 'manual'
  status: 'pending' | 'in_progress' | 'success' | 'failed'
  org_login: string | null
  repos_synced: number
  error_message: string | null
  retry_count: number
  started_at: string | null
  finished_at: string | null
  created_at: string
}

export interface WebhookDelivery {
  id: string
  delivery_id: string
  event_type: string
  action: string | null
  status: 'received' | 'queued' | 'processing' | 'success' | 'failed' | 'duplicate'
  payload_json: Record<string, unknown>
  error_message: string | null
  retry_count: number
  received_at: string
  created_at: string
}

export interface DeveloperReview {
  id: string
  pr_title: string
  pr_number: number
  pr_html_url: string | null
  repo_name: string
  state: 'approved' | 'changes_requested' | 'commented' | 'dismissed'
  date_reviewed: string
}

// Developer weekly trend (PRs per week, 90-day window)
export interface DeveloperWeeklyTrend {
  week_start: string    // ISO date string for start of week (YYYY-MM-DD)
  pr_count: number
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
