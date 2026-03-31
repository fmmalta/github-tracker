import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, Unique } from 'typeorm';

export enum MetricKey {
  // Developer/repo-level daily counts
  PRS_OPENED = 'prs_opened',
  PRS_MERGED = 'prs_merged',
  PRS_CLOSED_UNMERGED = 'prs_closed_unmerged',
  REVIEWS_SUBMITTED = 'reviews_submitted',
  ADDITIONS = 'additions',
  DELETIONS = 'deletions',
  CHANGED_FILES = 'changed_files',
  // Developer averages (computed over lifetime-to-date, stored per day snapshot)
  AVG_TIME_TO_FIRST_REVIEW_HOURS = 'avg_time_to_first_review_hours',
  AVG_TIME_TO_MERGE_HOURS = 'avg_time_to_merge_hours',
  AVG_PR_SIZE = 'avg_pr_size',
  // Aggregates
  PRS_OPENED_TOTAL = 'prs_opened_total',      // org or repo totals (no developer_id)
  PRS_MERGED_TOTAL = 'prs_merged_total',
  REVIEWS_SUBMITTED_TOTAL = 'reviews_submitted_total',
  // Failed CI proxy — PRs closed without merge (best available proxy without CI data)
  PRS_FAILED_CI = 'prs_failed_ci',            // per-developer count
  PRS_FAILED_CI_TOTAL = 'prs_failed_ci_total', // repo/org total (no developer_id)
  // Deploy proxy — PRs merged to default branch (main/master/production/prod)
  DEPLOYS = 'deploys',              // per-repo deploy count
  DEPLOYS_TOTAL = 'deploys_total',  // org-level total deploys (no repo_id)
  // Commit counts
  COMMITS = 'commits',              // per developer per repo per day
  COMMITS_TOTAL = 'commits_total',  // per repo or org total (no developer_id)
}

@Entity('daily_metrics')
@Unique(['metric_date', 'org_id', 'repo_id', 'developer_id', 'metric_key', 'branch'])
export class DailyMetric {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'date' })
  metric_date!: string;  // 'YYYY-MM-DD' — the day this row represents

  @Index()
  @Column({ type: 'uuid' })
  org_id!: string;  // Always present

  @Index()
  @Column({ type: 'uuid', nullable: true })
  repo_id!: string | null;  // Null for org-level aggregates

  @Index()
  @Column({ type: 'uuid', nullable: true })
  developer_id!: string | null;  // Null for repo/org-level aggregates

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  branch!: string | null;  // Null means all branches combined; 'main' means branch-specific

  @Column({
    type: 'enum',
    enum: MetricKey,
  })
  metric_key!: MetricKey;

  @Column({ type: 'numeric', precision: 18, scale: 4, default: 0 })
  metric_value!: number;  // Integer for counts, decimal for averages (hours)

  @CreateDateColumn()
  created_at!: Date;
}
