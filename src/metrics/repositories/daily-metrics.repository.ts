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

@Injectable()
export class DailyMetricsRepository {
  constructor(
    @InjectRepository(DailyMetric)
    private readonly repo: Repository<DailyMetric>,
  ) {}

  // Upsert: write or update row when same unique key combination already exists
  async upsertMany(rows: MetricRow[]): Promise<void> {
    if (rows.length === 0) return;

    // Build in chunks of 500 to avoid parameter overflow
    const CHUNK_SIZE = 500;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      await this.repo
        .createQueryBuilder()
        .insert()
        .into(DailyMetric)
        .values(
          chunk.map(r => ({
            metric_date: r.metricDate,
            org_id: r.orgId,
            repo_id: r.repoId,
            developer_id: r.developerId,
            branch: r.branch,
            metric_key: r.metricKey,
            metric_value: r.metricValue,
          })),
        )
        .orUpdate(['metric_value'], ['metric_date', 'org_id', 'repo_id', 'developer_id', 'metric_key', 'branch'])
        .execute();
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
