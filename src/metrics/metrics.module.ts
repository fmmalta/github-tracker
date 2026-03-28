import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { DailyMetric } from './entities/daily-metric.entity';
import { SyncJob } from '../github/entities/sync-job.entity';
import { DailyMetricsRepository } from './repositories/daily-metrics.repository';
import { AggregationService } from './aggregation.service';
import { NightlyAggregationProcessor, METRICS_QUEUE } from './processors/nightly-aggregation.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([DailyMetric, SyncJob]),
    BullModule.registerQueue({
      name: METRICS_QUEUE,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 60000 }, // 1min, 2min, 4min, 8min, 16min
        removeOnComplete: { count: 100 },
        removeOnFail: false, // Keep failed jobs for investigation
      },
    }),
  ],
  providers: [
    DailyMetricsRepository,
    AggregationService,
    NightlyAggregationProcessor,
  ],
  exports: [
    AggregationService,
    DailyMetricsRepository,
    BullModule,
  ],
})
export class MetricsModule {}
