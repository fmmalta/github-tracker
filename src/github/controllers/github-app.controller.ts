import {
  Controller, Get, Post, Body, HttpCode, HttpStatus, Logger, BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepo } from 'typeorm';
import { IsNumber, IsString, Min } from 'class-validator';
import { Organization } from '../entities/organization.entity';
import { SyncJob } from '../entities/sync-job.entity';
import { BACKFILL_QUEUE, BACKFILL_JOB } from '../../queue/queue.service';
import { AggregationService } from '../../metrics/aggregation.service';
import { Roles } from '../../auth/decorators/roles.decorator';

class ConnectOrganizationDto {
  @IsNumber()
  installationId!: number;

  @IsString()
  orgLogin!: string;

  @IsNumber()
  @Min(1)
  githubOrgId!: number;
}

class ConnectPatDto {
  @IsString()
  orgLogin!: string;
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
    private readonly aggregationService: AggregationService,
    private readonly configService: ConfigService,
  ) {}

  @Get('discover')
  @Roles('admin')
  async discoverOrganizations(): Promise<object> {
    const pat = this.configService.get<string>('GITHUB_PAT', '').trim();
    if (!pat || pat === 'placeholder') {
      throw new BadRequestException('GITHUB_PAT is not configured');
    }

    const { Octokit } = await import('@octokit/rest');
    const octokit = new Octokit({ auth: pat, request: { timeout: 30_000 } });

    const orgs: { login: string; id: number; avatar_url: string }[] = [];
    let page = 1;
    while (page <= 5) {
      const res = await octokit.rest.orgs.listForAuthenticatedUser({ per_page: 100, page });
      orgs.push(...res.data.map(o => ({ login: o.login, id: o.id, avatar_url: o.avatar_url })));
      if (res.data.length < 100) break;
      page++;
    }

    const connected = await this.orgRepo.find({ where: { is_active: true }, select: ['github_id'] });
    const connectedIds = new Set(connected.map(o => Number(o.github_id)));

    return {
      organizations: orgs.map(o => ({
        login: o.login,
        github_id: o.id,
        avatar_url: o.avatar_url,
        connected: connectedIds.has(o.id),
      })),
    };
  }

  @Post('connect-pat')
  @Roles('admin')
  @HttpCode(HttpStatus.ACCEPTED)
  async connectOrganizationViaPat(@Body() dto: ConnectPatDto): Promise<object> {
    const pat = this.configService.get<string>('GITHUB_PAT', '').trim();
    if (!pat || pat === 'placeholder') {
      throw new BadRequestException('GITHUB_PAT is not configured');
    }

    const { Octokit } = await import('@octokit/rest');
    const octokit = new Octokit({ auth: pat, request: { timeout: 30_000 } });

    const { data: orgData } = await octokit.rest.orgs.get({ org: dto.orgLogin });

    await this.orgRepo.upsert(
      {
        github_id: orgData.id,
        login: orgData.login,
        name: orgData.name ?? orgData.login,
        installation_id: '0',
        is_active: true,
      },
      { conflictPaths: ['github_id'] },
    );

    const org = await this.orgRepo.findOne({ where: { github_id: orgData.id } });
    if (!org) throw new Error(`Failed to create/find org ${dto.orgLogin}`);

    const syncJob = this.syncJobRepo.create({
      type: 'initial_backfill',
      status: 'pending',
      org_login: org.login,
      org_id: org.id,
    });
    await this.syncJobRepo.save(syncJob);

    await this.backfillQueue.add(BACKFILL_JOB, {
      installationId: 0,
      orgLogin: org.login,
      orgId: org.id,
      syncJobId: syncJob.id,
    });

    this.logger.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      severity: 'INFO',
      message: 'org_connected_via_pat',
      org_login: org.login,
      sync_job_id: syncJob.id,
    }));

    return {
      status: 'backfill_queued',
      orgLogin: org.login,
      syncJobId: syncJob.id,
    };
  }

  @Post('connect')
  @Roles('admin')
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

  @Post('sync')
  @Roles('admin')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerSync(@Body() body: { org_id?: string }): Promise<object> {
    const { org_id } = body;

    const org = org_id
      ? await this.orgRepo.findOne({ where: { id: org_id, is_active: true } })
      : await this.orgRepo.findOne({ where: { is_active: true }, order: { created_at: 'ASC' } });

    if (!org) throw new BadRequestException('No active organization found');

    const syncJob = this.syncJobRepo.create({
      type: 'manual',
      status: 'pending',
      org_login: org.login,
      org_id: org.id,
    });
    await this.syncJobRepo.save(syncJob);

    await this.backfillQueue.add(BACKFILL_JOB, {
      installationId: Number(org.installation_id) || 0,
      orgLogin: org.login,
      orgId: org.id,
      syncJobId: syncJob.id,
    });

    this.logger.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      severity: 'INFO',
      message: 'manual_sync_triggered',
      org_login: org.login,
      sync_job_id: syncJob.id,
    }));

    // Trigger aggregation in background (don't await, let it run after sync completes)
    // Schedule it to run in 30 seconds to allow sync to complete
    setTimeout(async () => {
      try {
        const yesterday = new Date();
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        await this.aggregationService.computeDailyMetrics(yesterday);
        this.logger.log(`Metrics aggregation triggered for ${yesterday.toISOString().split('T')[0]} after manual sync`);
      } catch (err) {
        this.logger.error(`Failed to trigger aggregation: ${(err as Error).message}`);
      }
    }, 30000);

    return { status: 'sync_queued', orgLogin: org.login, syncJobId: syncJob.id };
  }
}
