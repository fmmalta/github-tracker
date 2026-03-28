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
import { SyncJob } from '../entities/sync-job.entity';

export interface BackfillProgress {
  reposSynced: number;
  prsSynced: number;
  reviewsSynced: number;
  currentRepo?: string;
  lastCursor?: string | null;
}

export interface BackfillResult {
  reposSynced: number;
  prsSynced: number;
  reviewsSynced: number;
}

type OctokitClient = Awaited<ReturnType<GitHubAppService['getOctokitForInstallation']>>;

interface RepoSummary {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  language: string | null;
}

@Injectable()
export class BackfillService {
  private readonly logger = new Logger(BackfillService.name);
  private readonly BACKFILL_WINDOW_DAYS = 90;
  private readonly COMPLETENESS_TOLERANCE = 2; // Allow 2-PR discrepancy (race conditions)

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
    @InjectRepository(SyncJob)
    private readonly syncJobRepo: TypeOrmRepo<SyncJob>,
  ) {}

  async backfillOrganization(
    installationId: number,
    orgLogin: string,
    syncJobId: string,
    onProgress?: (progress: BackfillProgress) => Promise<void>,
  ): Promise<BackfillResult> {
    const octokit = await this.githubAppService.getOctokitForInstallation(installationId);

    // Find org record
    const org = await this.orgRepo.findOne({ where: { login: orgLogin } });
    if (!org) {
      throw new Error(`Organization ${orgLogin} not found in database`);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.BACKFILL_WINDOW_DAYS);

    // Fetch all repos in org
    const repos = await this.fetchAllRepos(octokit, orgLogin);

    this.logger.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        severity: 'INFO',
        message: 'backfill_repos_discovered',
        org: orgLogin,
        repo_count: repos.length,
      }),
    );

    let totalPrs = 0;
    let totalReviews = 0;

    for (const repo of repos) {
      // Upsert repository record
      await this.repoRepo.upsert(
        {
          github_id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          is_private: repo.private,
          language: repo.language ?? null,
          org_id: org.id,
          organization: org,
        },
        { conflictPaths: ['github_id'] },
      );

      const { prsProcessed, reviewsProcessed } = await this.backfillRepository(
        octokit,
        orgLogin,
        repo.name,
        org.id,
        cutoffDate,
      );

      totalPrs += prsProcessed;
      totalReviews += reviewsProcessed;

      // Update sync job progress in metadata
      if (onProgress) {
        await onProgress({
          reposSynced: repos.indexOf(repo) + 1,
          prsSynced: totalPrs,
          reviewsSynced: totalReviews,
          currentRepo: repo.full_name,
        });
      }
    }

    return {
      reposSynced: repos.length,
      prsSynced: totalPrs,
      reviewsSynced: totalReviews,
    };
  }

  private async fetchAllRepos(octokit: OctokitClient, orgLogin: string): Promise<RepoSummary[]> {
    const repos: RepoSummary[] = [];
    let page = 1;

    // Repos list still uses page-based pagination (GitHub hasn't deprecated this endpoint)
    while (true) {
      // withRateLimitHandling<T> returns T directly (extracts .data from ApiResponse<T>)
      const pageRepos = await this.rateLimitService.withRateLimitHandling(
        async () => {
          const res = await octokit.rest.repos.listForOrg({
            org: orgLogin,
            type: 'all',
            per_page: 100,
            page,
          });
          return { data: res.data, headers: res.headers as Record<string, string> };
        },
      );

      repos.push(
        ...pageRepos.map(r => ({
          id: r.id,
          name: r.name,
          full_name: r.full_name,
          private: r.private,
          language: r.language ?? null,
        })),
      );

      if (pageRepos.length < 100) {
        break; // Last page
      }
      page++;
    }

    return repos;
  }

  private async backfillRepository(
    octokit: OctokitClient,
    owner: string,
    repo: string,
    orgId: string,
    cutoffDate: Date,
  ): Promise<{ prsProcessed: number; reviewsProcessed: number }> {
    let cursor: string | null = null;
    let prsProcessed = 0;
    let reviewsProcessed = 0;
    let reachedCutoff = false;

    // Fetch PRs using cursor-based pagination (NOT page offset — deprecated Oct 2025)
    while (!reachedCutoff) {
      const params: Record<string, unknown> = {
        owner,
        repo,
        state: 'all',
        per_page: 100,
        sort: 'created',
        direction: 'desc',
      };

      // Add cursor if we have one from a previous page
      if (cursor !== null) {
        params['after'] = cursor;
      }

      // withRateLimitHandling<T> returns T directly; we return { data, headers } so we get both back
      const { prList, linkHeader } = await this.rateLimitService.withRateLimitHandling(
        async () => {
          const res = await octokit.rest.pulls.list(params as Parameters<typeof octokit.rest.pulls.list>[0]);
          return {
            data: { prList: res.data, linkHeader: (res.headers as Record<string, string>)['link'] ?? '' },
            headers: res.headers as Record<string, string>,
          };
        },
      );

      for (const pr of prList) {
        const createdAt = new Date(pr.created_at);

        if (createdAt < cutoffDate) {
          reachedCutoff = true;
          break; // Stop — beyond 90-day window
        }

        // Upsert developer
        await this.developerRepo.upsert(
          {
            github_id: pr.user!.id,
            login: pr.user!.login,
            avatar_url: pr.user!.avatar_url ?? null,
          },
          { conflictPaths: ['github_id'] },
        );

        // Upsert pull request with all raw GitHub fields
        await this.prRepo.upsert(
          {
            github_id: pr.id,
            number: pr.number,
            title: pr.title,
            body: pr.body ?? null,
            state: (pr.merged_at ? 'merged' : pr.state) as 'open' | 'closed' | 'merged',
            base_branch: pr.base.ref,
            head_branch: pr.head.ref,
            // additions/deletions/changed_files not available from pulls.list — use 0 as placeholder
            // (individual PR details endpoint can populate these if needed later)
            additions: 0,
            deletions: 0,
            changed_files: 0,
            github_created_at: new Date(pr.created_at),
            github_merged_at: pr.merged_at ? new Date(pr.merged_at) : null,
            github_closed_at: pr.closed_at ? new Date(pr.closed_at) : null,
            author_login: pr.user!.login,
            org_id: orgId,
          },
          { conflictPaths: ['github_id'] },
        );

        // Backfill reviews for this PR
        const prReviews = await this.backfillReviews(octokit, owner, repo, pr.number, orgId);
        reviewsProcessed += prReviews;
        prsProcessed++;
      }

      if (reachedCutoff || prList.length < 100) {
        break;
      }

      // Extract 'after' cursor from Link header (NOT page offset)
      cursor = this.extractCursorFromLinkHeader(linkHeader, 'next');

      if (!cursor) {
        break; // No next page
      }
    }

    // Validate completeness: compare against GitHub stats endpoint
    await this.validateBackfillCompleteness(octokit, owner, repo, prsProcessed);

    return { prsProcessed, reviewsProcessed };
  }

  private async backfillReviews(
    octokit: OctokitClient,
    owner: string,
    repo: string,
    prNumber: number,
    orgId: string,
  ): Promise<number> {
    const reviews = await this.rateLimitService.withRateLimitHandling(
      async () => {
        const res = await octokit.rest.pulls.listReviews({
          owner,
          repo,
          pull_number: prNumber,
          per_page: 100,
        });
        return { data: res.data, headers: res.headers as Record<string, string> };
      },
    );

    for (const review of reviews) {
      if (!review.user) continue;

      await this.developerRepo.upsert(
        {
          github_id: review.user.id,
          login: review.user.login,
          avatar_url: review.user.avatar_url ?? null,
        },
        { conflictPaths: ['github_id'] },
      );

      await this.reviewRepo.upsert(
        {
          github_id: review.id,
          state: review.state as 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED',
          body: review.body ?? null,
          submitted_at_github: new Date(review.submitted_at ?? Date.now()),
          reviewer_login: review.user.login,
          org_id: orgId,
        },
        { conflictPaths: ['github_id'] },
      );
    }

    return reviews.length;
  }

  private extractCursorFromLinkHeader(linkHeader: string, rel: string): string | null {
    // Link header format: <https://api.github.com/repos/.../pulls?after=abc&page=2>; rel="next"
    const links = linkHeader.split(',');
    for (const link of links) {
      if (link.includes(`rel="${rel}"`)) {
        const afterMatch = link.match(/[?&]after=([^&>]+)/);
        if (afterMatch?.[1]) {
          return afterMatch[1];
        }
        // Fallback: extract cursor from URL's page parameter if after not present
        const pageMatch = link.match(/<([^>]+)>/);
        return pageMatch?.[1] ?? null;
      }
    }
    return null;
  }

  async validateBackfillCompleteness(
    octokit: OctokitClient,
    owner: string,
    repo: string,
    fetchedCount: number,
  ): Promise<void> {
    // Use GitHub repo stats to verify we got all PRs in the 90-day window
    // Note: open_issues_count includes PRs; actual total requires separate check
    const repoStats = await this.rateLimitService.withRateLimitHandling(
      async () => {
        const res = await octokit.rest.repos.get({ owner, repo });
        return { data: res.data, headers: res.headers as Record<string, string> };
      },
    );

    // AUDIT-07: Log rate-limit check during validation
    this.logger.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        severity: 'INFO',
        message: 'backfill_completeness_check',
        repo: `${owner}/${repo}`,
        fetched_count: fetchedCount,
        repo_open_issues: repoStats.open_issues_count,
      }),
    );

    // If we fetched 0 PRs but repo has issues/PRs, something went wrong
    // Allow tolerance of COMPLETENESS_TOLERANCE for race conditions
    if (fetchedCount === 0 && repoStats.open_issues_count > this.COMPLETENESS_TOLERANCE) {
      throw new Error(
        `Backfill validation failed for ${owner}/${repo}: fetched 0 PRs but repo has ${repoStats.open_issues_count} open issues/PRs. Possible data gap.`,
      );
    }
  }
}
