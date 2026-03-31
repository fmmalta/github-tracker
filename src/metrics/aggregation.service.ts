import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DailyMetricsRepository, MetricRow } from './repositories/daily-metrics.repository';
import { MetricKey } from './entities/daily-metric.entity';

@Injectable()
export class AggregationService {
  private readonly logger = new Logger(AggregationService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly dailyMetricsRepository: DailyMetricsRepository,
  ) {}

  async computeDailyMetrics(date: Date): Promise<void> {
    const metricDate = date.toISOString().split('T')[0]; // 'YYYY-MM-DD'
    const dayStart = new Date(date);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setUTCHours(23, 59, 59, 999);

    this.logger.log(`Computing metrics for ${metricDate}`);

    const rows: MetricRow[] = [];

    // PRs opened
    const prsOpened: Array<{
      author_id: string; repository_id: string; org_id: string; base_branch: string; cnt: string;
    }> = await this.dataSource.query(`
      SELECT author_id, repository_id, org_id, base_branch, COUNT(*) as cnt
      FROM pull_requests
      WHERE github_created_at >= $1 AND github_created_at <= $2
        AND author_id IS NOT NULL
      GROUP BY author_id, repository_id, org_id, base_branch
    `, [dayStart, dayEnd]);

    for (const r of prsOpened) {
      rows.push({ metricDate, orgId: r.org_id, repoId: r.repository_id, developerId: r.author_id, branch: r.base_branch, metricKey: MetricKey.PRS_OPENED, metricValue: Number(r.cnt) });
    }

    // PRs merged
    const prsMerged: Array<{
      author_id: string; repository_id: string; org_id: string; base_branch: string; cnt: string;
    }> = await this.dataSource.query(`
      SELECT author_id, repository_id, org_id, base_branch, COUNT(*) as cnt
      FROM pull_requests
      WHERE github_merged_at >= $1 AND github_merged_at <= $2
        AND state = 'merged' AND author_id IS NOT NULL
      GROUP BY author_id, repository_id, org_id, base_branch
    `, [dayStart, dayEnd]);

    for (const r of prsMerged) {
      rows.push({ metricDate, orgId: r.org_id, repoId: r.repository_id, developerId: r.author_id, branch: r.base_branch, metricKey: MetricKey.PRS_MERGED, metricValue: Number(r.cnt) });
    }

    // PRs closed unmerged
    const prsClosedUnmerged: Array<{
      author_id: string; repository_id: string; org_id: string; base_branch: string; cnt: string;
    }> = await this.dataSource.query(`
      SELECT author_id, repository_id, org_id, base_branch, COUNT(*) as cnt
      FROM pull_requests
      WHERE github_closed_at >= $1 AND github_closed_at <= $2
        AND state = 'closed' AND github_merged_at IS NULL AND author_id IS NOT NULL
      GROUP BY author_id, repository_id, org_id, base_branch
    `, [dayStart, dayEnd]);

    for (const r of prsClosedUnmerged) {
      rows.push({ metricDate, orgId: r.org_id, repoId: r.repository_id, developerId: r.author_id, branch: r.base_branch, metricKey: MetricKey.PRS_CLOSED_UNMERGED, metricValue: Number(r.cnt) });
    }

    // Reviews submitted
    const reviewsSubmitted: Array<{
      reviewer_id: string; repository_id: string; org_id: string; cnt: string;
    }> = await this.dataSource.query(`
      SELECT r.reviewer_id, pr.repository_id, r.org_id, COUNT(*) as cnt
      FROM reviews r
      JOIN pull_requests pr ON pr.id = r.pull_request_id
      WHERE r.submitted_at_github >= $1 AND r.submitted_at_github <= $2
        AND r.reviewer_id IS NOT NULL
      GROUP BY r.reviewer_id, pr.repository_id, r.org_id
    `, [dayStart, dayEnd]);

    for (const r of reviewsSubmitted) {
      rows.push({ metricDate, orgId: r.org_id, repoId: r.repository_id, developerId: r.reviewer_id, branch: null, metricKey: MetricKey.REVIEWS_SUBMITTED, metricValue: Number(r.cnt) });
    }

    // Additions, deletions, changed_files (PRs opened that day)
    const codeChanges: Array<{
      author_id: string; repository_id: string; org_id: string; base_branch: string;
      total_additions: string; total_deletions: string; total_changed_files: string;
    }> = await this.dataSource.query(`
      SELECT author_id, repository_id, org_id, base_branch,
        SUM(additions) as total_additions,
        SUM(deletions) as total_deletions,
        SUM(changed_files) as total_changed_files
      FROM pull_requests
      WHERE github_created_at >= $1 AND github_created_at <= $2
        AND author_id IS NOT NULL
      GROUP BY author_id, repository_id, org_id, base_branch
    `, [dayStart, dayEnd]);

    for (const r of codeChanges) {
      rows.push({ metricDate, orgId: r.org_id, repoId: r.repository_id, developerId: r.author_id, branch: r.base_branch, metricKey: MetricKey.ADDITIONS, metricValue: Number(r.total_additions) });
      rows.push({ metricDate, orgId: r.org_id, repoId: r.repository_id, developerId: r.author_id, branch: r.base_branch, metricKey: MetricKey.DELETIONS, metricValue: Number(r.total_deletions) });
      rows.push({ metricDate, orgId: r.org_id, repoId: r.repository_id, developerId: r.author_id, branch: r.base_branch, metricKey: MetricKey.CHANGED_FILES, metricValue: Number(r.total_changed_files) });
    }

    // Averages — only for merged PRs on this date
    const averages: Array<{
      author_id: string; repository_id: string; org_id: string;
      avg_first_review_hours: string | null;
      avg_merge_hours: string | null;
      avg_pr_size: string | null;
    }> = await this.dataSource.query(`
      SELECT
        author_id,
        repository_id,
        org_id,
        AVG(
          CASE WHEN first_review_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (first_review_at - github_created_at)) / 3600
            ELSE NULL
          END
        ) as avg_first_review_hours,
        AVG(EXTRACT(EPOCH FROM (github_merged_at - github_created_at)) / 3600) as avg_merge_hours,
        AVG(additions + deletions) as avg_pr_size
      FROM pull_requests
      WHERE github_merged_at >= $1 AND github_merged_at <= $2
        AND state = 'merged' AND author_id IS NOT NULL
        AND github_merged_at IS NOT NULL
      GROUP BY author_id, repository_id, org_id
    `, [dayStart, dayEnd]);

    for (const r of averages) {
      if (r.avg_first_review_hours !== null) {
        rows.push({ metricDate, orgId: r.org_id, repoId: r.repository_id, developerId: r.author_id, branch: null, metricKey: MetricKey.AVG_TIME_TO_FIRST_REVIEW_HOURS, metricValue: parseFloat(r.avg_first_review_hours) });
      }
      if (r.avg_merge_hours !== null) {
        rows.push({ metricDate, orgId: r.org_id, repoId: r.repository_id, developerId: r.author_id, branch: null, metricKey: MetricKey.AVG_TIME_TO_MERGE_HOURS, metricValue: parseFloat(r.avg_merge_hours) });
      }
      if (r.avg_pr_size !== null) {
        rows.push({ metricDate, orgId: r.org_id, repoId: r.repository_id, developerId: r.author_id, branch: null, metricKey: MetricKey.AVG_PR_SIZE, metricValue: parseFloat(r.avg_pr_size) });
      }
    }

    // Totals — aggregate per (org, repo) without developer breakdown
    // prs_opened_total
    const prsOpenedTotals: Array<{ repository_id: string; org_id: string; cnt: string }> = await this.dataSource.query(`
      SELECT repository_id, org_id, COUNT(*) as cnt
      FROM pull_requests
      WHERE github_created_at >= $1 AND github_created_at <= $2
      GROUP BY repository_id, org_id
    `, [dayStart, dayEnd]);
    for (const r of prsOpenedTotals) {
      rows.push({ metricDate, orgId: r.org_id, repoId: r.repository_id, developerId: null, branch: null, metricKey: MetricKey.PRS_OPENED_TOTAL, metricValue: Number(r.cnt) });
    }

    // prs_merged_total
    const prsMergedTotals: Array<{ repository_id: string; org_id: string; cnt: string }> = await this.dataSource.query(`
      SELECT repository_id, org_id, COUNT(*) as cnt
      FROM pull_requests
      WHERE github_merged_at >= $1 AND github_merged_at <= $2 AND state = 'merged'
      GROUP BY repository_id, org_id
    `, [dayStart, dayEnd]);
    for (const r of prsMergedTotals) {
      rows.push({ metricDate, orgId: r.org_id, repoId: r.repository_id, developerId: null, branch: null, metricKey: MetricKey.PRS_MERGED_TOTAL, metricValue: Number(r.cnt) });
    }

    // reviews_submitted_total
    const reviewsTotals: Array<{ repository_id: string; org_id: string; cnt: string }> = await this.dataSource.query(`
      SELECT pr.repository_id, r.org_id, COUNT(*) as cnt
      FROM reviews r
      JOIN pull_requests pr ON pr.id = r.pull_request_id
      WHERE r.submitted_at_github >= $1 AND r.submitted_at_github <= $2
      GROUP BY pr.repository_id, r.org_id
    `, [dayStart, dayEnd]);
    for (const r of reviewsTotals) {
      rows.push({ metricDate, orgId: r.org_id, repoId: r.repository_id, developerId: null, branch: null, metricKey: MetricKey.REVIEWS_SUBMITTED_TOTAL, metricValue: Number(r.cnt) });
    }

    if (rows.length > 0) {
      await this.dailyMetricsRepository.upsertMany(rows);
      this.logger.log(`Wrote ${rows.length} metric rows for ${metricDate}`);
    } else {
      this.logger.log(`No data found for ${metricDate} — no rows written`);
    }
  }
}
