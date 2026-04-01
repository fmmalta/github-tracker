import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyMetric, MetricKey } from '../entities/daily-metric.entity';

export interface MetricRow {
  metricDate: string;      // 'YYYY-MM-DD'
  orgId: string;
  repoId: string | null;
  developerId: string | null;
  branch: string | null;
  metricKey: MetricKey;
  metricValue: number;
}

const NULL_UUID = '00000000-0000-0000-0000-000000000000';
const NULL_BRANCH = '__null__';

@Injectable()
export class DailyMetricsRepository {
  constructor(
    @InjectRepository(DailyMetric)
    private readonly repo: Repository<DailyMetric>,
  ) {}

  async upsertMany(rows: MetricRow[]): Promise<void> {
    if (rows.length === 0) return;

    const CHUNK_SIZE = 500;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const params: any[] = [];
      const valueRows = chunk.map(r => {
        const base = params.length;
        params.push(
          r.metricDate,
          r.orgId,
          r.repoId ?? NULL_UUID,
          r.developerId ?? NULL_UUID,
          r.branch ?? NULL_BRANCH,
          r.metricKey,
          r.metricValue,
        );
        return `(DEFAULT, $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, DEFAULT)`;
      });

      await this.repo.query(
        `INSERT INTO "daily_metrics"("id", "metric_date", "org_id", "repo_id", "developer_id", "branch", "metric_key", "metric_value", "created_at")
         VALUES ${valueRows.join(', ')}
         ON CONFLICT ON CONSTRAINT "UQ_daily_metrics_logical_key"
         DO UPDATE SET "metric_value" = EXCLUDED."metric_value"`,
        params,
      );
    }
  }

  async findByDateRange(params: {
    startDate: string;
    endDate: string;
    orgId: string;
    repoId?: string;
    developerId?: string;
    branch?: string;
    metricKeys?: MetricKey[];
  }): Promise<DailyMetric[]> {
    const qb = this.repo.createQueryBuilder('dm')
      .where('dm.metric_date >= :startDate AND dm.metric_date <= :endDate', {
        startDate: params.startDate,
        endDate: params.endDate,
      })
      .andWhere('dm.org_id = :orgId', { orgId: params.orgId });

    if (params.repoId !== undefined) {
      qb.andWhere('dm.repo_id = :repoId', { repoId: params.repoId });
    }
    if (params.developerId !== undefined) {
      qb.andWhere('dm.developer_id = :developerId', { developerId: params.developerId });
    }
    if (params.branch !== undefined) {
      qb.andWhere('dm.branch = :branch', { branch: params.branch });
    }
    if (params.metricKeys && params.metricKeys.length > 0) {
      qb.andWhere('dm.metric_key IN (:...metricKeys)', { metricKeys: params.metricKeys });
    }

    return qb.orderBy('dm.metric_date', 'ASC').getMany();
  }
}
