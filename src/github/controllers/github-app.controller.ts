import {
  Controller, Post, Body, HttpCode, HttpStatus, Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepo } from 'typeorm';
import { IsNumber, IsString, Min } from 'class-validator';
import { Organization } from '../entities/organization.entity';
import { SyncJob } from '../entities/sync-job.entity';
import { BACKFILL_QUEUE, BACKFILL_JOB } from '../../queue/queue.service';

class ConnectOrganizationDto {
  @IsNumber()
  installationId!: number;

  @IsString()
  orgLogin!: string;

  @IsNumber()
  @Min(1)
  githubOrgId!: number;
}

@Controller('github')
export class GithubAppController {
  private readonly logger = new Logger(GithubAppController.name);

  constructor(
    @InjectQueue(BACKFILL_QUEUE)
    private readonly backfillQueue: Queue,
    @InjectRepository(Organization)
    private readonly orgRepo: TypeOrmRepo<Organization>,
    @InjectRepository(SyncJob)
    private readonly syncJobRepo: TypeOrmRepo<SyncJob>,
  ) {}

  @Post('connect')
  @HttpCode(HttpStatus.ACCEPTED)
  async connectOrganization(@Body() dto: ConnectOrganizationDto): Promise<object> {
    const { installationId, orgLogin, githubOrgId } = dto;

    // Upsert org record
    await this.orgRepo.upsert(
      {
        github_id: githubOrgId,
        login: orgLogin,
        installation_id: String(installationId),
        is_active: true,
      },
      { conflictPaths: ['github_id'] },
    );

    const org = await this.orgRepo.findOne({ where: { github_id: githubOrgId } });
    if (!org) {
      throw new Error(`Failed to create/find org ${orgLogin}`);
    }

    // Create sync job record (pending)
    const syncJob = this.syncJobRepo.create({
      type: 'initial_backfill',
      status: 'pending',
      org_login: orgLogin,
      org_id: org.id,
    });
    await this.syncJobRepo.save(syncJob);

    // Enqueue backfill job
    await this.backfillQueue.add(BACKFILL_JOB, {
      installationId,
      orgLogin,
      orgId: org.id,
      syncJobId: syncJob.id,
    });

    // AUDIT-02: Log org connection
    this.logger.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        severity: 'INFO',
        message: 'org_connected',
        org_login: orgLogin,
        installation_id: installationId,
        sync_job_id: syncJob.id,
      }),
    );

    return {
      status: 'backfill_queued',
      orgLogin,
      syncJobId: syncJob.id,
    };
  }
}
