import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepository } from 'typeorm';
import { Repository } from '../github/entities/repository.entity';
import { Developer } from '../github/entities/developer.entity';
import { PullRequest } from '../github/entities/pull-request.entity';
import { Organization } from '../github/entities/organization.entity';
import { SyncJob } from '../github/entities/sync-job.entity';
import { WebhookDelivery } from '../github/entities/webhook-delivery.entity';
import { Review } from '../github/entities/review.entity';
import { GitHubAppService } from '../github/services/github-app.service';
import { RedisService } from '../redis/redis.service';
import { RepoQueryDto } from './dto/repo-query.dto';
import { DeveloperQueryDto } from './dto/developer-query.dto';
import { PrQueryDto } from './dto/pr-query.dto';
import { AdminQueryDto } from './dto/admin-query.dto';

export interface DeveloperReviewDto {
  id: string;
  pr_title: string;
  pr_number: number;
  pr_html_url: string | null;
  repo_name: string;
  base_branch: string;
  state: 'approved' | 'changes_requested' | 'commented' | 'dismissed';
  date_reviewed: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class DataService {
  private readonly logger = new Logger(DataService.name);

  constructor(
    @InjectRepository(Repository)
    private readonly repoRepo: TypeOrmRepository<Repository>,
    @InjectRepository(Developer)
    private readonly developerRepo: TypeOrmRepository<Developer>,
    @InjectRepository(PullRequest)
    private readonly prRepo: TypeOrmRepository<PullRequest>,
    @InjectRepository(Organization)
    private readonly orgRepo: TypeOrmRepository<Organization>,
    @InjectRepository(SyncJob)
    private readonly syncJobRepo: TypeOrmRepository<SyncJob>,
    @InjectRepository(WebhookDelivery)
    private readonly webhookDeliveryRepo: TypeOrmRepository<WebhookDelivery>,
    @InjectRepository(Review)
    private readonly reviewRepo: TypeOrmRepository<Review>,
    private readonly githubAppService: GitHubAppService,
    private readonly redisService: RedisService,
  ) {}

  async getOrgs(userId?: string, userRole?: string): Promise<{ id: string; login: string; name: string | null }[]> {
    // TODO: restore role-based org filtering after admin management UI is built
    const orgs = await this.orgRepo.find({ where: { is_active: true }, order: { login: 'ASC' } });
    return orgs.map(o => ({ id: o.id, login: o.login, name: o.name }));
  }

  async getRepos(orgId: string, query: RepoQueryDto): Promise<PaginatedResponse<Repository>> {
    const qb = this.repoRepo.createQueryBuilder('repo')
      .where('repo.org_id = :orgId', { orgId });

    if (query.search) {
      qb.andWhere('(repo.name ILIKE :search OR repo.full_name ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const total = await qb.getCount();
    const sortCol = `repo.${query.sort_by ?? 'name'}`;
    const data = await qb
      .orderBy(sortCol, query.sort_dir ?? 'ASC')
      .skip(query.offset ?? 0)
      .take(query.limit ?? 50)
      .getMany();

    return { data, total, limit: query.limit ?? 50, offset: query.offset ?? 0 };
  }

  async getRepo(orgId: string, repoId: string): Promise<Repository | null> {
    return this.repoRepo.findOne({ where: { id: repoId, org_id: orgId } });
  }

  async getDevelopers(orgId: string, query: DeveloperQueryDto): Promise<PaginatedResponse<Developer>> {
    // Developers are org-scoped via their PR activity — we look up developers who have PRs in this org
    const qb = this.developerRepo.createQueryBuilder('dev')
      .innerJoin('pull_requests', 'pr', 'pr.author_id = dev.id AND pr.org_id = :orgId', { orgId })
      .distinct(true);

    if (query.search) {
      qb.andWhere('(dev.login ILIKE :search OR dev.name ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const total = await qb.getCount();
    const sortCol = `dev.${query.sort_by ?? 'login'}`;
    const data = await qb
      .orderBy(sortCol, query.sort_dir ?? 'ASC')
      .skip(query.offset ?? 0)
      .take(query.limit ?? 50)
      .getMany();

    return { data, total, limit: query.limit ?? 50, offset: query.offset ?? 0 };
  }

  async getDeveloper(orgId: string, developerId: string): Promise<Developer | null> {
    // Verify developer has activity in this org before returning
    const result = await this.developerRepo.createQueryBuilder('dev')
      .innerJoin('pull_requests', 'pr', 'pr.author_id = dev.id AND pr.org_id = :orgId', { orgId })
      .where('dev.id = :developerId', { developerId })
      .getOne();
    return result;
  }

  async getPullRequests(orgId: string, query: PrQueryDto): Promise<PaginatedResponse<any>> {
    const qb = this.prRepo.createQueryBuilder('pr')
      .leftJoinAndSelect('pr.repository', 'repo')
      .where('pr.org_id = :orgId', { orgId });

    if (query.repo_id) {
      qb.andWhere('pr.repository_id = :repoId', { repoId: query.repo_id });
    }
    if (query.developer_id) {
      qb.andWhere('pr.author_id = :developerId', { developerId: query.developer_id });
    }
    if (query.state) {
      qb.andWhere('pr.state = :state', { state: query.state });
    }
    if (query.branch) {
      qb.andWhere('pr.base_branch = :branch', { branch: query.branch });
    }
    if (query.start_date) {
      qb.andWhere('pr.github_created_at >= :startDate', { startDate: new Date(query.start_date) });
    }
    if (query.end_date) {
      qb.andWhere('pr.github_created_at <= :endDate', { endDate: new Date(query.end_date + 'T23:59:59Z') });
    }

    const total = await qb.getCount();
    const sortCol = `pr.${query.sort_by ?? 'github_created_at'}`;
    const data = await qb
      .orderBy(sortCol, query.sort_dir ?? 'DESC')
      .skip(query.offset ?? 0)
      .take(query.limit ?? 50)
      .getMany();

    const mappedData = data.map(pr => {
      const fullName = pr.repository?.full_name;
      return {
        ...pr,
        repository_name: pr.repository?.name ?? pr.repository_id,
        html_url: fullName ? `https://github.com/${fullName}/pull/${pr.number}` : null,
      };
    });

    return { data: mappedData, total, limit: query.limit ?? 50, offset: query.offset ?? 0 };
  }

  async getSyncHistory(query: AdminQueryDto): Promise<{ data: SyncJob[]; total: number }> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const [data, total] = await this.syncJobRepo.findAndCount({
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { data, total };
  }

  async getWebhookDlq(query: AdminQueryDto): Promise<{ data: WebhookDelivery[]; total: number }> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const [data, total] = await this.webhookDeliveryRepo.findAndCount({
      where: { status: 'failed' },
      order: { received_at: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { data, total };
  }

  async retryWebhookDelivery(id: string): Promise<{ ok: boolean }> {
    const delivery = await this.webhookDeliveryRepo.findOneOrFail({ where: { id } });
    await this.webhookDeliveryRepo.update(id, { status: 'queued', retry_count: delivery.retry_count + 1 });
    // Re-queue is handled by the webhook processor watching 'queued' status.
    // For now, marking as 'queued' surfaces it for the next processing cycle.
    return { ok: true };
  }

  async getDeveloperReviews(
    developerId: string,
    orgId: string,
    query: { limit?: number; offset?: number },
  ): Promise<{ data: DeveloperReviewDto[]; total: number }> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const [reviews, total] = await this.reviewRepo.findAndCount({
      where: { reviewer_id: developerId, org_id: orgId },
      relations: ['pull_request', 'pull_request.repository'],
      order: { submitted_at_github: 'DESC' },
      take: limit,
      skip: offset,
    });

    const data: DeveloperReviewDto[] = reviews.map((r) => {
      const pr = r.pull_request;
      const repo = pr?.repository;
      const prHtmlUrl = repo?.full_name && pr?.number
        ? `https://github.com/${repo.full_name}/pull/${pr.number}`
        : null;

      return {
        id: r.id,
        pr_title: pr?.title ?? '(unknown)',
        pr_number: pr?.number ?? 0,
        pr_html_url: prHtmlUrl,
        repo_name: repo?.name ?? '(unknown)',
        base_branch: pr?.base_branch ?? 'unknown',
        state: r.state.toLowerCase() as 'approved' | 'changes_requested' | 'commented' | 'dismissed',
        date_reviewed: r.submitted_at_github.toISOString(),
      };
    });

    return { data, total };
  }

  async getReadme(orgId: string, repoId: string): Promise<{ content: string } | null> {
    const repo = await this.repoRepo.findOne({ where: { id: repoId, org_id: orgId } });
    if (!repo) return null;

    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org?.installation_id) return null;

    const cacheKey = `readme:${orgId}:${repoId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    try {
      const octokit = await this.githubAppService.getOctokitForInstallation(
        Number(org.installation_id),
      );

      const [owner, repoName] = repo.full_name.split('/');
      const res = await octokit.rest.repos.getReadme({
        owner,
        repo: repoName,
        mediaType: { format: 'raw' },
      });

      const content = typeof res.data === 'string' ? res.data : String(res.data);
      const result = { content };

      await this.redisService.set(cacheKey, JSON.stringify(result), 3600);
      return result;
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string };
      if (error.status === 404) return null;
      this.logger.warn(`Failed to fetch README for ${repo.full_name}: ${error.message}`);
      return null;
    }
  }
}
