import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { SyncJob } from '../../github/entities/sync-job.entity';
import { AggregationService } from '../aggregation.service';

export const METRICS_QUEUE = 'metrics';
export const NIGHTLY_AGGREGATION_JOB = 'nightly-aggregation';

@Processor(METRICS_QUEUE)
export class NightlyAggregationProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(NightlyAggregationProcessor.name);
  private readonly MAX_SYNC_WAIT_MS = 4 * 60 * 60 * 1000; // 4 hours

  constructor(
    private readonly aggregationService: AggregationService,
    @InjectRepository(SyncJob)
    private readonly syncJobRepo: Repository<SyncJob>,
    @InjectQueue(METRICS_QUEUE) private readonly metricsQueue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== NIGHTLY_AGGREGATION_JOB) return;

    this.logger.log('Nightly aggregation job started');

    // Check for active sync jobs
    const activeSyncJob = await this.syncJobRepo.findOne({
      where: { status: 'in_progress' },
      order: { started_at: 'DESC' },
    });

    if (activeSyncJob) {
      const elapsedMs = Date.now() - (activeSyncJob.started_at?.getTime() ?? Date.now());
      if (elapsedMs < this.MAX_SYNC_WAIT_MS) {
        const elapsedMin = Math.round(elapsedMs / 60000);
        this.logger.log(`Sync job in progress (${elapsedMin}min elapsed). Delaying metrics aggregation.`);
        // Throw to trigger BullMQ retry with backoff
        throw new Error(`Sync in progress — will retry (elapsed: ${elapsedMin}min)`);
      } else {
        this.logger.warn(`Sync job exceeded 4h limit. Skipping metrics for today — will recompute tomorrow.`);
        return;
      }
    }

    // No active sync — compute metrics for yesterday (most complete data)
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    await this.aggregationService.computeDailyMetrics(yesterday);
    this.logger.log(`Nightly aggregation completed for ${yesterday.toISOString().split('T')[0]}`);
  }

  async onModuleInit() {
    // Remove any existing repeatable jobs to avoid duplicates on restart
    const repeatableJobs = await this.metricsQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === NIGHTLY_AGGREGATION_JOB) {
        await this.metricsQueue.removeRepeatableByKey(job.key);
      }
    }

    // Schedule nightly at 2am UTC
    await this.metricsQueue.add(
      NIGHTLY_AGGREGATION_JOB,
      {},
      {
        repeat: { pattern: '0 2 * * *', tz: 'UTC' },
        attempts: 5,
        backoff: { type: 'exponential', delay: 60000 },
      },
    );
    this.logger.log('Nightly aggregation job scheduled: 0 2 * * * UTC');
  }
}
