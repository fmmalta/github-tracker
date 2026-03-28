import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepo } from 'typeorm';
import { Job } from 'bullmq';
import { BackfillService } from '../services/backfill.service';
import { SyncJob } from '../entities/sync-job.entity';
import { Organization } from '../entities/organization.entity';
import { BACKFILL_QUEUE } from '../../queue/queue.service';

interface BackfillJobData {
  installationId: number;
  orgLogin: string;
  orgId: string;
  syncJobId: string;
}

@Processor(BACKFILL_QUEUE)
export class BackfillProcessor extends WorkerHost {
  private readonly logger = new Logger(BackfillProcessor.name);

  constructor(
    private readonly backfillService: BackfillService,
    @InjectRepository(SyncJob)
    private readonly syncJobRepo: TypeOrmRepo<SyncJob>,
    @InjectRepository(Organization)
    private readonly orgRepo: TypeOrmRepo<Organization>,
  ) {
    super();
  }

  async process(job: Job<BackfillJobData>): Promise<void> {
    const { installationId, orgLogin, orgId, syncJobId } = job.data;

    // Load sync job record
    const syncJob = await this.syncJobRepo.findOne({ where: { id: syncJobId } });
    if (!syncJob) {
      throw new Error(`SyncJob ${syncJobId} not found`);
    }

    // Mark as in_progress
    syncJob.status = 'in_progress';
    syncJob.started_at = new Date();
    await this.syncJobRepo.save(syncJob);

    // AUDIT-05: Log sync job started
    this.logger.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        severity: 'INFO',
        message: 'sync_job_started',
        sync_job_id: syncJobId,
        type: syncJob.type,
        org: orgLogin,
        status: 'in_progress',
      }),
    );

    try {
      const result = await this.backfillService.backfillOrganization(
        installationId,
        orgLogin,
        syncJobId,
        async progress => {
          // Update progress in metadata for admin visibility
          syncJob.progress_metadata = {
            repos_synced: progress.reposSynced,
            prs_synced: progress.prsSynced,
            reviews_synced: progress.reviewsSynced,
            current_repo: progress.currentRepo ?? null,
          };
          syncJob.repos_synced = progress.reposSynced;
          syncJob.prs_synced = progress.prsSynced;
          syncJob.reviews_synced = progress.reviewsSynced;
          await this.syncJobRepo.save(syncJob);
        },
      );

      // Mark success
      syncJob.status = 'success';
      syncJob.finished_at = new Date();
      syncJob.repos_synced = result.reposSynced;
      syncJob.prs_synced = result.prsSynced;
      syncJob.reviews_synced = result.reviewsSynced;
      await this.syncJobRepo.save(syncJob);

      // AUDIT-06: Log sync job completed
      this.logger.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          severity: 'INFO',
          message: 'sync_job_completed',
          sync_job_id: syncJobId,
          type: syncJob.type,
          org: orgLogin,
          status: 'success',
          records_processed: {
            repos: result.reposSynced,
            prs: result.prsSynced,
            reviews: result.reviewsSynced,
          },
          errors: null,
        }),
      );
    } catch (err: unknown) {
      const error = err as Error;

      // Mark failed
      syncJob.status = 'failed';
      syncJob.finished_at = new Date();
      syncJob.error_message = error.message;
      syncJob.retry_count = (job.attemptsMade ?? 0) + 1;
      await this.syncJobRepo.save(syncJob);

      // AUDIT-06: Log sync job failed
      this.logger.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          severity: 'ERROR',
          message: 'sync_job_completed',
          sync_job_id: syncJobId,
          type: syncJob.type,
          org: orgLogin,
          status: 'failed',
          records_processed: {
            repos: syncJob.repos_synced,
            prs: syncJob.prs_synced,
          },
          errors: error.message,
        }),
      );

      throw err; // Re-throw so BullMQ retries
    }
  }
}
