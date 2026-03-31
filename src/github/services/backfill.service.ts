import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepo } from 'typeorm';
import { GitHubAppService } from './github-app.service';
import { RateLimitService } from './rate-limit.service';
import { Organization } from '../entities/organization.entity';
import { Repository as RepoEntity } from '../entities/repository.entity';
import { Developer } from '../entities/developer.entity';
import { PullRequest } from '../entities/pull-request.entity';
import { Review } from '../entities/review.entity';
import { Deployment } from '../entities/deployment.entity';

export interface BackfillProgress {
  reposSynced: number;
  prsSynced: number;
  reviewsSynced: number;
  currentRepo?: string;
}

export interface BackfillResult {
  reposSynced: number;
  prsSynced: number;
  reviewsSynced: number;
}

type OctokitClient = Awaited<ReturnType<GitHubAppService['getOctokitForInstallation']>>;
const DEPLOYMENT_STATUS_STATES = new Set([
  'error',
  'failure',
  'inactive',
  'in_progress',
  'pending',
  'queued',
  'success',
]);

@Injectable()
export class BackfillService {
  private readonly logger = new Logger(BackfillService.name);
  private readonly BACKFILL_WINDOW_DAYS = 90;
  private readonly MAX_REPOS_PER_ORG = 500; // Prevent infinite loops on massive orgs
  private readonly MAX_PR_PAGES = 50; // Max 5000 PRs per repo (100 per page)
  private readonly MAX_REVIEW_PAGES = 100; // Max 10000 reviews per PR (100 per page)
  private readonly MAX_DEPLOYMENT_PAGES = 20; // Max 2000 deployments per repo (100 per page)
  private readonly MAX_DEPLOYMENT_STATUS_PAGES = 20; // Max 2000 statuses per deployment

  constructor(
    private readonly githubAppService: GitHubAppService,
    private readonly rateLimitService: RateLimitService,
    @InjectRepository(Organization)
    private readonly orgRepo: TypeOrmRepo<Organization>,
    @InjectRepository(RepoEntity)
    private readonly repoRepo: TypeOrmRepo<RepoEntity>,
    @InjectRepository(Developer)
    private readonly developerRepo: TypeOrmRepo<Developer>,
    @InjectRepository(PullRequest)
    private readonly prRepo: TypeOrmRepo<PullRequest>,
    @InjectRepository(Review)
    private readonly reviewRepo: TypeOrmRepo<Review>,
    @InjectRepository(Deployment)
    private readonly deploymentRepo: TypeOrmRepo<Deployment>,
  ) {}

  async backfillOrganization(
    installationId: number,
    orgLogin: string,
    syncJobId: string,
    onProgress?: (progress: BackfillProgress) => Promise<void>,
  ): Promise<BackfillResult> {
    const octokit = await this.githubAppService.getOctokitForInstallation(installationId);

    const org = await this.orgRepo.findOne({ where: { login: orgLogin } });
    if (!org) throw new Error(`Organization ${orgLogin} not found in database`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.BACKFILL_WINDOW_DAYS);

    const repos = await this.fetchAllRepos(octokit, orgLogin);

    this.logger.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      severity: 'INFO',
      message: 'backfill_repos_discovered',
      org: orgLogin,
      repo_count: repos.length,
    }));

    let totalPrs = 0;
    let totalReviews = 0;
    let totalDeployments = 0;
    let reposCompleted = 0;

    const processRepo = async (repo: (typeof repos)[number]) => {
      try {
        await this.repoRepo.upsert(
          {
            github_id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            is_private: repo.private,
            language: repo.language ?? null,
            github_created_at: repo.created_at ? new Date(repo.created_at) : null,
            org_id: org.id,
          },
          { conflictPaths: ['github_id'] },
        );

        const repoEntity = await this.repoRepo.findOneOrFail({ where: { github_id: repo.id } });

        const { prsProcessed, reviewsProcessed, deploymentsProcessed } = await this.backfillRepository(
          octokit,
          orgLogin,
          repo.name,
          org.id,
          repoEntity.id,
          cutoffDate,
          onProgress
            ? async (prsDelta: number, reviewsDelta: number) => {
                totalPrs += prsDelta;
                totalReviews += reviewsDelta;
                await onProgress({
                  reposSynced: reposCompleted,
                  prsSynced: totalPrs,
                  reviewsSynced: totalReviews,
                  currentRepo: repo.full_name,
                });
              }
            : undefined,
        );

        totalPrs += prsProcessed;
        totalReviews += reviewsProcessed;
        totalDeployments += deploymentsProcessed;

        this.logger.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          severity: 'INFO',
          message: 'repo_backfilled',
          repo: repo.full_name,
          prs: prsProcessed,
          reviews: reviewsProcessed,
          deployments: deploymentsProcessed,
        }));
      } catch (err) {
        // Log and skip — don't let one bad repo kill the whole sync
        this.logger.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          severity: 'ERROR',
          message: 'repo_backfill_failed',
          repo: repo.full_name,
          error: (err as Error).message,
        }));
      }

      reposCompleted++;
      if (onProgress) {
        await onProgress({
          reposSynced: reposCompleted,
          prsSynced: totalPrs,
          reviewsSynced: totalReviews,
          currentRepo: repo.full_name,
        });
      }
    };

    await this.processWithConcurrency(repos, processRepo, 3);

    this.logger.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      severity: 'INFO',
      message: 'backfill_deployments_completed',
      org: orgLogin,
      deployments: totalDeployments,
    }));

    return { reposSynced: repos.length, prsSynced: totalPrs, reviewsSynced: totalReviews };
  }

  private async fetchAllRepos(octokit: OctokitClient, orgLogin: string) {
    const repos: {
      id: number;
      name: string;
      full_name: string;
      private: boolean;
      language: string | null;
      created_at: string | null | undefined;
    }[] = [];
    let page = 1;

    while (page <= this.MAX_REPOS_PER_ORG / 100) {
      const pageRepos = await this.rateLimitService.withRateLimitHandling(async () => {
        const res = await octokit.rest.repos.listForOrg({ org: orgLogin, type: 'all', per_page: 100, page });
        return { data: res.data, headers: res.headers as Record<string, string> };
      });

      repos.push(...pageRepos.map(r => ({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        private: r.private,
        language: r.language ?? null,
        created_at: r.created_at,
      })));

      if (pageRepos.length < 100) break;
      page++;

      // Stop if we've reached max repos limit
      if (repos.length >= this.MAX_REPOS_PER_ORG) {
        this.logger.warn(`Organization ${orgLogin} has >500 repos, stopping backfill to prevent timeout`);
        break;
      }
    }

    return repos;
  }

  private async backfillRepository(
    octokit: OctokitClient,
    owner: string,
    repo: string,
    orgId: string,
    repoId: string,
    cutoffDate: Date,
    onRepoProgress?: (prsDelta: number, reviewsDelta: number) => Promise<void>,
  ): Promise<{ prsProcessed: number; reviewsProcessed: number; deploymentsProcessed: number }> {
    let prsProcessed = 0;
    let reviewsProcessed = 0;
    let deploymentsProcessed = 0;
    let page = 1;
    let reachedCutoff = false;
    let prsInThisBatch = 0;

    while (!reachedCutoff && page <= this.MAX_PR_PAGES) {
      const prList = await this.rateLimitService.withRateLimitHandling(async () => {
        const res = await octokit.rest.pulls.list({
          owner,
          repo,
          state: 'all',
          per_page: 100,
          page,
          sort: 'created',
          direction: 'desc',
        });
        return { data: res.data, headers: res.headers as Record<string, string> };
      });

      const pendingReviewFetches: { prNumber: number; prEntityId: string }[] = [];

      for (const pr of prList) {
        if (new Date(pr.created_at) < cutoffDate) {
          reachedCutoff = true;
          break;
        }

        if (!pr.user) continue;

        const authorName = await this.fetchDeveloperName(octokit, pr.user.login);
        await this.developerRepo.upsert(
          {
            github_id: pr.user.id,
            login: pr.user.login,
            avatar_url: pr.user.avatar_url ?? null,
            name: authorName,
          },
          { conflictPaths: ['github_id'] },
        );

        const devEntity = await this.developerRepo.findOneOrFail({ where: { github_id: pr.user.id } });

        // Fetch individual PR to get additions/deletions (not available in pulls.list)
        const prDetail = await this.rateLimitService.withRateLimitHandling(async () => {
          const res = await octokit.rest.pulls.get({ owner, repo, pull_number: pr.number });
          return { data: res.data, headers: res.headers as Record<string, string> };
        });

        await this.prRepo.upsert(
          {
            github_id: pr.id,
            number: pr.number,
            title: pr.title,
            body: pr.body ?? null,
            state: (pr.merged_at ? 'merged' : pr.state) as 'open' | 'closed' | 'merged',
            base_branch: pr.base.ref,
            head_branch: pr.head.ref,
            additions: prDetail.additions,
            deletions: prDetail.deletions,
            changed_files: prDetail.changed_files,
            github_created_at: new Date(pr.created_at),
            github_merged_at: pr.merged_at ? new Date(pr.merged_at) : null,
            github_closed_at: pr.closed_at ? new Date(pr.closed_at) : null,
            author_login: pr.user.login,
            author_id: devEntity.id,
            org_id: orgId,
            repository_id: repoId,
          },
          { conflictPaths: ['github_id'] },
        );

        // Look up the PR's DB uuid for the reviews FK
        const prEntity = await this.prRepo.findOneOrFail({ where: { github_id: pr.id } });
        pendingReviewFetches.push({ prNumber: pr.number, prEntityId: prEntity.id });
        prsProcessed++;
        prsInThisBatch++;

        this.logger.debug(JSON.stringify({
          message: 'pr_saved',
          repo: `${owner}/${repo}`,
          pr_number: pr.number,
        }));

        // Heartbeat every 10 PRs to keep the job alive
        if (onRepoProgress && prsInThisBatch % 10 === 0) {
          await onRepoProgress(prsInThisBatch, 0);
          prsInThisBatch = 0;
        }
      }

      // Fetch reviews for this page's PRs in parallel (3 at a time)
      this.logger.debug(JSON.stringify({
        message: 'fetching_reviews_batch',
        repo: `${owner}/${repo}`,
        pr_count: pendingReviewFetches.length,
      }));

      await this.processWithConcurrency(
        pendingReviewFetches,
        async (item) => {
          const prReviews = await this.backfillReviews(octokit, owner, repo, item.prNumber, orgId, item.prEntityId);
          reviewsProcessed += prReviews;

          this.logger.debug(JSON.stringify({
            message: 'reviews_saved',
            repo: `${owner}/${repo}`,
            pr_number: item.prNumber,
            review_count: prReviews,
          }));

          // Heartbeat after each PR's reviews are processed
          if (onRepoProgress && prReviews > 0) {
            await onRepoProgress(0, prReviews);
          }
        },
        3,
      );

      if (reachedCutoff || prList.length < 100) break;
      page++;
    }

    deploymentsProcessed = await this.backfillDeployments(
      octokit,
      owner,
      repo,
      orgId,
      repoId,
      cutoffDate,
    );

    return { prsProcessed, reviewsProcessed, deploymentsProcessed };
  }

  private async backfillDeployments(
    octokit: OctokitClient,
    owner: string,
    repo: string,
    orgId: string,
    repoId: string,
    cutoffDate: Date,
  ): Promise<number> {
    let deploymentsProcessed = 0;
    let page = 1;
    let reachedCutoff = false;

    while (!reachedCutoff && page <= this.MAX_DEPLOYMENT_PAGES) {
      const deployments = await this.rateLimitService.withRateLimitHandling(async () => {
        const res = await octokit.rest.repos.listDeployments({
          owner,
          repo,
          per_page: 100,
          page,
        });
        return { data: res.data, headers: res.headers as Record<string, string> };
      });

      for (const deployment of deployments) {
        const createdAt = new Date(deployment.created_at);
        if (createdAt < cutoffDate) {
          reachedCutoff = true;
          break;
        }

        const latestStatus = await this.fetchLatestDeploymentStatus(octokit, owner, repo, deployment.id);

        await this.deploymentRepo.upsert(
          {
            github_id: deployment.id,
            repository_id: repoId,
            org_id: orgId,
            environment: deployment.environment ?? null,
            sha: deployment.sha ?? null,
            ref: deployment.ref ?? null,
            task: deployment.task ?? null,
            github_created_at: createdAt,
            latest_status_state: this.normalizeDeploymentStatusState(latestStatus?.state ?? null),
            latest_status_at: latestStatus?.timestamp ?? null,
            status_payload_json: (latestStatus?.raw ?? null) as any,
          },
          { conflictPaths: ['github_id'] },
        );

        deploymentsProcessed++;
      }

      if (reachedCutoff || deployments.length < 100) break;
      page++;
    }

    return deploymentsProcessed;
  }

  private async fetchLatestDeploymentStatus(
    octokit: OctokitClient,
    owner: string,
    repo: string,
    deploymentId: number,
  ): Promise<{ state: string | null; timestamp: Date | null; raw: Record<string, unknown> | null }> {
    let page = 1;
    let latest: { state: string | null; timestamp: Date | null; raw: Record<string, unknown> | null } = {
      state: null,
      timestamp: null,
      raw: null,
    };

    while (page <= this.MAX_DEPLOYMENT_STATUS_PAGES) {
      const statuses = await this.rateLimitService.withRateLimitHandling(async () => {
        const res = await octokit.rest.repos.listDeploymentStatuses({
          owner,
          repo,
          deployment_id: deploymentId,
          per_page: 100,
          page,
        });
        return { data: res.data, headers: res.headers as Record<string, string> };
      });

      if (statuses.length === 0) break;

      for (const status of statuses) {
        const statusAt = new Date(status.created_at);
        if (!latest.timestamp || statusAt.getTime() > latest.timestamp.getTime()) {
          latest = {
            state: status.state ?? null,
            timestamp: statusAt,
            raw: status as unknown as Record<string, unknown>,
          };
        }
      }

      if (statuses.length < 100) break;
      page++;
    }

    return latest;
  }

  private normalizeDeploymentStatusState(state: string | null): Deployment['latest_status_state'] {
    if (!state) return null;
    const normalized = state.toLowerCase();
    return DEPLOYMENT_STATUS_STATES.has(normalized)
      ? normalized as Deployment['latest_status_state']
      : null;
  }

  private async backfillReviews(
    octokit: OctokitClient,
    owner: string,
    repo: string,
    prNumber: number,
    orgId: string,
    pullRequestId: string,
  ): Promise<number> {
    const reviews: any[] = [];
    let page = 1;

    // Paginate through reviews with max page limit
    while (page <= this.MAX_REVIEW_PAGES) {
      const pageReviews = await this.rateLimitService.withRateLimitHandling(async () => {
        const res = await octokit.rest.pulls.listReviews({
          owner,
          repo,
          pull_number: prNumber,
          per_page: 100,
          page,
        });
        return { data: res.data, headers: res.headers as Record<string, string> };
      });

      reviews.push(...pageReviews);

      if (pageReviews.length < 100) break;
      page++;
    }

    for (const review of reviews) {
      if (!review.user) continue;

      const reviewerName = await this.fetchDeveloperName(octokit, review.user.login);
      await this.developerRepo.upsert(
        {
          github_id: review.user.id,
          login: review.user.login,
          avatar_url: review.user.avatar_url ?? null,
          name: reviewerName,
        },
        { conflictPaths: ['github_id'] },
      );

      const reviewerEntity = await this.developerRepo.findOneOrFail({ where: { github_id: review.user.id } });

      await this.reviewRepo.upsert(
        {
          github_id: review.id,
          state: review.state as 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED',
          body: review.body ?? null,
          submitted_at_github: new Date(review.submitted_at ?? Date.now()),
          reviewer_login: review.user.login,
          reviewer_id: reviewerEntity.id,
          org_id: orgId,
          pull_request_id: pullRequestId,
        },
        { conflictPaths: ['github_id'] },
      );
    }

    return reviews.length;
  }

  private async fetchDeveloperName(octokit: OctokitClient, login: string): Promise<string | null> {
    try {
      const userData = await this.rateLimitService.withRateLimitHandling(async () => {
        const res = await octokit.rest.users.getByUsername({ username: login });
        return { data: res.data, headers: res.headers as Record<string, string> };
      });
      return userData.name ?? null;
    } catch (err) {
      // 404 (deleted user), rate limit exhaustion, or network error — degrade gracefully
      this.logger.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        severity: 'WARN',
        message: 'developer_name_fetch_failed',
        login,
        error: (err as Error).message,
      }));
      return null;
    }
  }

  private async processWithConcurrency<T>(
    items: T[],
    fn: (item: T) => Promise<void>,
    concurrency: number,
  ): Promise<void> {
    let index = 0;

    const worker = async () => {
      while (index < items.length) {
        const item = items[index++];
        await fn(item);
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
    await Promise.all(workers);
  }
}
