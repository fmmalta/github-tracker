import { MetricKey } from '../entities/daily-metric.entity';

export interface MetricDefinition {
  key: MetricKey;
  name: string;
  formula: string;
  unit: string;
  disclaimer: string;
}

export const METRIC_DEFINITIONS: Record<MetricKey, MetricDefinition> = {
  [MetricKey.PRS_OPENED]: {
    key: MetricKey.PRS_OPENED,
    name: 'PRs Opened',
    formula: 'COUNT of pull requests where created_at falls within the date range',
    unit: 'count',
    disclaimer: 'Reflects GitHub activity patterns. High counts may reflect small PR culture, not necessarily higher output.',
  },
  [MetricKey.PRS_MERGED]: {
    key: MetricKey.PRS_MERGED,
    name: 'PRs Merged',
    formula: 'COUNT of pull requests where merged_at falls within the date range and state=merged',
    unit: 'count',
    disclaimer: 'Reflects delivery activity. Does not account for PR size or complexity.',
  },
  [MetricKey.PRS_CLOSED_UNMERGED]: {
    key: MetricKey.PRS_CLOSED_UNMERGED,
    name: 'PRs Closed Without Merge',
    formula: 'COUNT of pull requests where closed_at falls within the date range and state=closed and merged_at IS NULL',
    unit: 'count',
    disclaimer: 'May indicate abandoned work or superseded approaches. Context is required to interpret.',
  },
  [MetricKey.REVIEWS_SUBMITTED]: {
    key: MetricKey.REVIEWS_SUBMITTED,
    name: 'Code Reviews Submitted',
    formula: 'COUNT of reviews where submitted_at falls within the date range',
    unit: 'count',
    disclaimer: 'Reflects review participation. Does not measure review quality or thoroughness.',
  },
  [MetricKey.ADDITIONS]: {
    key: MetricKey.ADDITIONS,
    name: 'Lines Added',
    formula: 'SUM of additions across all PRs opened in the date range',
    unit: 'lines',
    disclaimer: 'Line counts vary widely by language, refactoring, and generated code. Do not interpret as productivity.',
  },
  [MetricKey.DELETIONS]: {
    key: MetricKey.DELETIONS,
    name: 'Lines Deleted',
    formula: 'SUM of deletions across all PRs opened in the date range',
    unit: 'lines',
    disclaimer: 'Deleting code (reducing complexity, removing duplication) is often a positive contribution.',
  },
  [MetricKey.CHANGED_FILES]: {
    key: MetricKey.CHANGED_FILES,
    name: 'Files Changed',
    formula: 'SUM of changed_files across all PRs opened in the date range',
    unit: 'files',
    disclaimer: 'File count does not reflect change complexity or impact.',
  },
  [MetricKey.AVG_TIME_TO_FIRST_REVIEW_HOURS]: {
    key: MetricKey.AVG_TIME_TO_FIRST_REVIEW_HOURS,
    name: 'Average Time to First Review',
    formula: 'AVG((first_review_at - created_at) in hours) for merged PRs where first_review_at IS NOT NULL',
    unit: 'hours',
    disclaimer: 'Excludes PRs with no review. Lower values indicate faster review cycles, but context (PR size, reviewer availability) matters.',
  },
  [MetricKey.AVG_TIME_TO_MERGE_HOURS]: {
    key: MetricKey.AVG_TIME_TO_MERGE_HOURS,
    name: 'Average Time to Merge',
    formula: 'AVG((merged_at - created_at) in hours) for PRs merged within 30 days (outliers >30 days excluded)',
    unit: 'hours',
    disclaimer: 'PRs taking more than 30 days to merge are excluded to prevent outlier skew. Longer times may reflect thorough review, not slow delivery.',
  },
  [MetricKey.AVG_PR_SIZE]: {
    key: MetricKey.AVG_PR_SIZE,
    name: 'Average PR Size',
    formula: 'AVG(additions + deletions) for PRs merged in the date range',
    unit: 'lines changed',
    disclaimer: 'Smaller PRs generally merge faster. This metric reflects PR scope habits, not productivity.',
  },
  [MetricKey.PRS_OPENED_TOTAL]: {
    key: MetricKey.PRS_OPENED_TOTAL,
    name: 'Total PRs Opened (Repository)',
    formula: 'COUNT of all pull requests opened in the date range for this repository (all developers)',
    unit: 'count',
    disclaimer: 'Repository-level aggregate. See per-developer breakdown for individual contributions.',
  },
  [MetricKey.PRS_MERGED_TOTAL]: {
    key: MetricKey.PRS_MERGED_TOTAL,
    name: 'Total PRs Merged (Repository)',
    formula: 'COUNT of all pull requests merged in the date range for this repository',
    unit: 'count',
    disclaimer: 'Repository-level aggregate.',
  },
  [MetricKey.REVIEWS_SUBMITTED_TOTAL]: {
    key: MetricKey.REVIEWS_SUBMITTED_TOTAL,
    name: 'Total Reviews Submitted (Repository)',
    formula: 'COUNT of all code reviews submitted in the date range for this repository',
    unit: 'count',
    disclaimer: 'Repository-level aggregate.',
  },
  [MetricKey.PRS_FAILED_CI]: {
    key: MetricKey.PRS_FAILED_CI,
    name: 'PRs Closed Without Merge (CI Proxy)',
    formula: 'COUNT of pull requests where closed_at falls within the date range and state=closed and merged_at IS NULL, per developer',
    unit: 'count',
    disclaimer: 'Proxy metric: uses PRs closed without merge as a stand-in for CI/pipeline failures. This includes abandoned PRs, superseded work, and declined PRs — not exclusively CI failures. Interpret with caution.',
  },
  [MetricKey.PRS_FAILED_CI_TOTAL]: {
    key: MetricKey.PRS_FAILED_CI_TOTAL,
    name: 'Total PRs Closed Without Merge (CI Proxy)',
    formula: 'COUNT of all pull requests closed without merge in the date range for this repository',
    unit: 'count',
    disclaimer: 'Repository-level aggregate. Proxy metric: uses PRs closed without merge as a stand-in for CI/pipeline failures. Context is required to interpret accurately.',
  },
  [MetricKey.DEPLOYS]: {
    key: MetricKey.DEPLOYS,
    name: 'Deploys',
    formula: 'COUNT of PRs merged to main/master/production branch per day',
    unit: 'count',
    disclaimer: 'Uses PR merges to default branch as a deploy proxy. Does not capture direct pushes or CD pipeline deploys.',
  },
  [MetricKey.DEPLOYS_TOTAL]: {
    key: MetricKey.DEPLOYS_TOTAL,
    name: 'Total Deploys (Organization)',
    formula: 'COUNT of all PRs merged to main/master/production across all repositories',
    unit: 'count',
    disclaimer: 'Organization-level deploy proxy. See per-repository breakdown for individual repo deploy frequency.',
  },
  [MetricKey.COMMITS]: {
    key: MetricKey.COMMITS,
    name: 'Commits',
    formula: 'COUNT of commits where committed_at falls within the date range',
    unit: 'count',
    disclaimer: 'Counts commits associated with pull requests. Direct pushes to branches may not be captured.',
  },
  [MetricKey.COMMITS_TOTAL]: {
    key: MetricKey.COMMITS_TOTAL,
    name: 'Total Commits (Repository)',
    formula: 'COUNT of all commits in the date range for this repository',
    unit: 'count',
    disclaimer: 'Repository-level aggregate. Includes all developers.',
  },
};

export interface HealthStatus {
  status: 'ok' | 'degraded'
  queue: {
    metrics_queue_depth: number
  }
  last_sync: {
    completed_at: string | null
    type: string | null
    status: string | null
  } | null
  last_metrics_aggregation: string | null
}
