import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DailyMetric, MetricKey } from './entities/daily-metric.entity';
import { DailyMetricsRepository } from './repositories/daily-metrics.repository';
import { SyncJob } from '../github/entities/sync-job.entity';
import { MetricsQueryDto } from './dto/metrics-query.dto';
import { METRIC_DEFINITIONS } from './dto/metrics-response.dto';

export interface AggregatedMetric {
  metric_key: MetricKey;
  total: number;
  definition: typeof METRIC_DEFINITIONS[MetricKey];
}

export interface LeaderboardEntry {
  developer_id: string;
  metric_key: MetricKey;
  total: number;
  rank: number;
}

export interface HealthStatus {
  status: 'ok' | 'degraded';
  queue: {
    metrics_queue_depth: number;
  };
  last_sync: {
    completed_at: string | null;
    type: string | null;
    status: string | null;
  };
  last_metrics_aggregation: string | null;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    private readonly dailyMetricsRepository: DailyMetricsRepository,
    @InjectRepository(SyncJob)
    private readonly syncJobRepo: Repository<SyncJob>,
    @InjectRepository(DailyMetric)
    private readonly dailyMetricRepo: Repository<DailyMetric>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getOrgMetrics(orgId: string, query: MetricsQueryDto): Promise<{ data: AggregatedMetric[]; definitions: typeof METRIC_DEFINITIONS }> {
    const rows = await this.dailyMetricsRepository.findByDateRange({
      startDate: query.start_date,
      endDate: query.end_date,
      orgId,
      branch: query.branch,
      metricKeys: query.metric_key ? [query.metric_key] : undefined,
    });

    const data = this.aggregateRows(rows);
    return { data, definitions: METRIC_DEFINITIONS };
  }

  async getRepoMetrics(repoId: string, orgId: string, query: MetricsQueryDto): Promise<{ data: AggregatedMetric[]; definitions: typeof METRIC_DEFINITIONS }> {
    const rows = await this.dailyMetricsRepository.findByDateRange({
      startDate: query.start_date,
      endDate: query.end_date,
      orgId,
      repoId,
      branch: query.branch,
      metricKeys: query.metric_key ? [query.metric_key] : undefined,
    });

    const data = this.aggregateRows(rows);
    return { data, definitions: METRIC_DEFINITIONS };
  }

  async getDeveloperMetrics(developerId: string, orgId: string, query: MetricsQueryDto): Promise<{ data: AggregatedMetric[]; definitions: typeof METRIC_DEFINITIONS }> {
    const rows = await this.dailyMetricsRepository.findByDateRange({
      startDate: query.start_date,
      endDate: query.end_date,
      orgId,
      developerId,
      repoId: query.repo_id,
      branch: query.branch,
      metricKeys: query.metric_key ? [query.metric_key] : undefined,
    });

    const data = this.aggregateRows(rows);
    return { data, definitions: METRIC_DEFINITIONS };
  }

  async getLeaderboard(orgId: string, query: MetricsQueryDto): Promise<{ data: LeaderboardEntry[]; total: number; limit: number; offset: number }> {
    // Rank developers by specified metric_key (default: PRS_MERGED)
    const targetKey = query.metric_key ?? MetricKey.PRS_MERGED;
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const results: Array<{ developer_id: string; total: string }> = await this.dataSource.query(`
      SELECT developer_id, SUM(metric_value) as total
      FROM daily_metrics
      WHERE org_id = $1
        AND metric_date >= $2 AND metric_date <= $3
        AND metric_key = $4
        AND developer_id IS NOT NULL
        ${query.repo_id ? 'AND repo_id = $6' : ''}
      GROUP BY developer_id
      ORDER BY total ${query.sort_dir ?? 'DESC'}
      LIMIT $5
    `, query.repo_id
      ? [orgId, query.start_date, query.end_date, targetKey, limit + offset, query.repo_id]
      : [orgId, query.start_date, query.end_date, targetKey, limit + offset]
    );

    const paginated = results.slice(offset, offset + limit);
    const data: LeaderboardEntry[] = paginated.map((r, i) => ({
      developer_id: r.developer_id,
      metric_key: targetKey,
      total: Number(r.total),
      rank: offset + i + 1,
    }));

    return { data, total: results.length, limit, offset };
  }

  async getTrends(orgId: string, query: MetricsQueryDto): Promise<{ data: DailyMetric[] }> {
    // Returns daily rows for METRICS-13 (90-day trend data)
    const rows = await this.dailyMetricsRepository.findByDateRange({
      startDate: query.start_date,
      endDate: query.end_date,
      orgId,
      repoId: query.repo_id,
      developerId: query.developer_id,
      branch: query.branch,
      metricKeys: [MetricKey.PRS_OPENED_TOTAL, MetricKey.PRS_MERGED_TOTAL],
    });
    return { data: rows };
  }

  async getHealth(): Promise<HealthStatus> {
    try {
      const lastSync = await this.syncJobRepo.findOne({
        where: { status: 'success' },
        order: { finished_at: 'DESC' },
      });

      const lastMetrics = await this.dailyMetricRepo.findOne({
        order: { created_at: 'DESC' },
      });

      return {
        status: 'ok',
        queue: {
          metrics_queue_depth: 0, // BullMQ queue depth — placeholder; full BullMQ inspection in Phase 4
        },
        last_sync: {
          completed_at: lastSync?.finished_at?.toISOString() ?? null,
          type: lastSync?.type ?? null,
          status: lastSync?.status ?? null,
        },
        last_metrics_aggregation: lastMetrics?.created_at?.toISOString() ?? null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Health check error: ${message}`);
      return {
        status: 'degraded',
        queue: { metrics_queue_depth: 0 },
        last_sync: { completed_at: null, type: null, status: null },
        last_metrics_aggregation: null,
      };
    }
  }

  private aggregateRows(rows: DailyMetric[]): AggregatedMetric[] {
    // For count metrics: SUM across the date range
    // For average metrics: simple AVG across rows (each row is already a daily average)
    const AVERAGE_KEYS = new Set([
      MetricKey.AVG_TIME_TO_FIRST_REVIEW_HOURS,
      MetricKey.AVG_TIME_TO_MERGE_HOURS,
      MetricKey.AVG_PR_SIZE,
    ]);

    const accumulated = new Map<MetricKey, number[]>();
    for (const row of rows) {
      if (!accumulated.has(row.metric_key)) accumulated.set(row.metric_key, []);
      accumulated.get(row.metric_key)!.push(Number(row.metric_value));
    }

    return Array.from(accumulated.entries()).map(([key, values]) => ({
      metric_key: key,
      total: AVERAGE_KEYS.has(key)
        ? values.reduce((a, b) => a + b, 0) / values.length
        : values.reduce((a, b) => a + b, 0),
      definition: METRIC_DEFINITIONS[key],
    }));
  }
}
