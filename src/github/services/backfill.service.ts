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

@Injectable()
export class BackfillService {
  private readonly logger = new Logger(BackfillService.name);
  private readonly BACKFILL_WINDOW_DAYS = 90;

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

    for (let i = 0; i < repos.length; i++) {
      const repo = repos[i];

      try {
        // Upsert repository and get its DB id back in one step
        await this.repoRepo.upsert(
          {
            github_id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            is_private: repo.private,
            language: repo.language ?? null,
            org_id: org.id,
          },
          { conflictPaths: ['github_id'] },
        );

        const repoEntity = await this.repoRepo.findOneOrFail({ where: { github_id: repo.id } });

        const { prsProcessed, reviewsProcessed } = await this.backfillRepository(
          octokit,
          orgLogin,
          repo.name,
          org.id,
          repoEntity.id,
          cutoffDate,
        );

        totalPrs += prsProcessed;
        totalReviews += reviewsProcessed;

        this.logger.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          severity: 'INFO',
          message: 'repo_backfilled',
          repo: repo.full_name,
          prs: prsProcessed,
          reviews: reviewsProcessed,
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

      if (onProgress) {
        await onProgress({
          reposSynced: i + 1,
          prsSynced: totalPrs,
          reviewsSynced: totalReviews,
          currentRepo: repo.full_name,
        });
      }
    }

    return { reposSynced: repos.length, prsSynced: totalPrs, reviewsSynced: totalReviews };
  }

  private async fetchAllRepos(octokit: OctokitClient, orgLogin: string) {
    const repos: { id: number; name: string; full_name: string; private: boolean; language: string | null }[] = [];
    let page = 1;

    while (true) {
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
      })));

      if (pageRepos.length < 100) break;
      page++;
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
  ): Promise<{ prsProcessed: number; reviewsProcessed: number }> {
    let prsProcessed = 0;
    let reviewsProcessed = 0;
    let page = 1;
    let reachedCutoff = false;

    while (!reachedCutoff) {
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
        const prReviews = await this.backfillReviews(octokit, owner, repo, pr.number, orgId, prEntity.id);
        reviewsProcessed += prReviews;
        prsProcessed++;
      }

      if (reachedCutoff || prList.length < 100) break;
      page++;
    }

    return { prsProcessed, reviewsProcessed };
  }

  private async backfillReviews(
    octokit: OctokitClient,
    owner: string,
    repo: string,
    prNumber: number,
    orgId: string,
    pullRequestId: string,
  ): Promise<number> {
    const reviews = await this.rateLimitService.withRateLimitHandling(async () => {
      const res = await octokit.rest.pulls.listReviews({ owner, repo, pull_number: prNumber, per_page: 100 });
      return { data: res.data, headers: res.headers as Record<string, string> };
    });

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
}
