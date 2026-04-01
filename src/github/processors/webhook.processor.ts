import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepo } from 'typeorm';
import { Job } from 'bullmq';
import { WebhookDelivery } from '../entities/webhook-delivery.entity';
import { PullRequest } from '../entities/pull-request.entity';
import { Developer } from '../entities/developer.entity';
import { Review } from '../entities/review.entity';
import { Commit } from '../entities/commit.entity';
import { Repository as RepoEntity } from '../entities/repository.entity';
import { Deployment } from '../entities/deployment.entity';
import { GitHubAppService } from '../services/github-app.service';
import { RateLimitService } from '../services/rate-limit.service';
import { Organization } from '../entities/organization.entity';
import { WEBHOOK_QUEUE } from '../../queue/queue.service';

interface GitHubPrPayload {
  id: number;
  number: number;
  title: string;
  state: string;
  base: { ref: string };
  head: { ref: string };
  additions: number;
  deletions: number;
  changed_files: number;
  created_at: string;
  merged_at: string | null;
  closed_at: string | null;
  user: { id: number; login: string; name?: string; avatar_url?: string | null };
  body: string | null;
}

interface GitHubReviewPayload {
  id: number;
  state: string;
  body: string | null;
  submitted_at: string;
  user: { id: number; login: string };
}

interface GitHubRepositoryPayload {
  id: number;
}

interface GitHubDeploymentPayload {
  id: number;
  environment?: string | null;
  sha?: string | null;
  ref?: string | null;
  task?: string | null;
  created_at?: string;
}

interface GitHubDeploymentStatusPayload {
  state: string;
  created_at?: string;
  updated_at?: string;
  deployment?: { id: number };
}

const DEPLOYMENT_STATUS_STATES = new Set([
  'error',
  'failure',
  'inactive',
  'in_progress',
  'pending',
  'queued',
  'success',
]);

@Processor(WEBHOOK_QUEUE)
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    @InjectRepository(WebhookDelivery)
    private readonly deliveryRepo: TypeOrmRepo<WebhookDelivery>,
    @InjectRepository(PullRequest)
    private readonly prRepo: TypeOrmRepo<PullRequest>,
    @InjectRepository(Developer)
    private readonly developerRepo: TypeOrmRepo<Developer>,
    @InjectRepository(Review)
    private readonly reviewRepo: TypeOrmRepo<Review>,
    @InjectRepository(Commit)
    private readonly commitRepo: TypeOrmRepo<Commit>,
    @InjectRepository(RepoEntity)
    private readonly repoRepo: TypeOrmRepo<RepoEntity>,
    @InjectRepository(Deployment)
    private readonly deploymentRepo: TypeOrmRepo<Deployment>,
    @InjectRepository(Organization)
    private readonly orgRepo: TypeOrmRepo<Organization>,
    private readonly githubAppService: GitHubAppService,
    private readonly rateLimitService: RateLimitService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    return this.handleWebhookEvent(job);
  }

  async handleWebhookEvent(job: Job): Promise<void> {
    const { deliveryId, eventType, action, payload, orgId } = job.data as {
      deliveryId: string;
      eventType: string;
      action: string | null;
      payload: Record<string, unknown>;
      receivedAt: string;
      orgId: string | null;
    };

    // Mark as processing
    const delivery = await this.deliveryRepo.findOne({ where: { delivery_id: deliveryId } });
    if (delivery) {
      delivery.status = 'processing';
      await this.deliveryRepo.save(delivery);
    }

    try {
      if (eventType === 'pull_request') {
        await this.processPullRequestEvent(payload, orgId);
      } else if (eventType === 'pull_request_review') {
        await this.processPullRequestReviewEvent(payload, orgId);
      } else if (eventType === 'deployment') {
        await this.processDeploymentEvent(payload, orgId);
      } else if (eventType === 'deployment_status') {
        await this.processDeploymentStatusEvent(payload, orgId);
      } else {
        this.logger.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            severity: 'INFO',
            message: 'webhook_event_ignored',
            event_type: eventType,
            delivery_id: deliveryId,
          }),
        );
      }

      // AUDIT-04: Log success
      if (delivery) {
        delivery.status = 'success';
        delivery.processed_at = new Date();
        await this.deliveryRepo.save(delivery);
      }

      this.logger.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          severity: 'INFO',
          message: 'webhook_processed',
          delivery_id: deliveryId,
          event_type: eventType,
          action,
          status: 'success',
        }),
      );
    } catch (err: unknown) {
      const error = err as Error;

      // AUDIT-04: Log failure
      if (delivery) {
        delivery.status = 'failed';
        delivery.error_message = error.message;
        delivery.retry_count = (job.attemptsMade ?? 0) + 1;
        await this.deliveryRepo.save(delivery);
      }

      this.logger.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          severity: 'ERROR',
          message: 'webhook_processed',
          delivery_id: deliveryId,
          event_type: eventType,
          status: 'failed',
          error: error.message,
        }),
      );

      throw err; // Re-throw so BullMQ retries the job
    }
  }

  private async processPullRequestEvent(
    payload: Record<string, unknown>,
    orgId: string | null,
  ): Promise<void> {
    const pr = payload['pull_request'] as GitHubPrPayload;
    const repo = payload['repository'] as GitHubRepositoryPayload | undefined;
    const author = pr.user;
    const repository = await this.resolveRepository(repo?.id);
    const effectiveOrgId = repository?.org_id ?? orgId;

    if (!repository || !effectiveOrgId) {
      throw new Error(`Repository context missing for PR webhook (repo_github_id=${repo?.id ?? 'unknown'})`);
    }

    // Upsert developer by github_id
    await this.developerRepo.upsert(
      {
        github_id: author.id,
        login: author.login,
        name: author.name ?? null,
        avatar_url: author.avatar_url ?? null,
      },
      { conflictPaths: ['github_id'] },
    );

    // Upsert pull request by github_id
    await this.prRepo.upsert(
      {
        github_id: pr.id,
        number: pr.number,
        title: pr.title,
        body: pr.body,
        state: pr.state === 'closed' && pr.merged_at ? 'merged' : (pr.state as 'open' | 'closed' | 'merged'),
        base_branch: pr.base.ref,
        head_branch: pr.head.ref,
        additions: pr.additions ?? 0,
        deletions: pr.deletions ?? 0,
        changed_files: pr.changed_files ?? 0,
        github_created_at: new Date(pr.created_at),
        github_merged_at: pr.merged_at ? new Date(pr.merged_at) : null,
        github_closed_at: pr.closed_at ? new Date(pr.closed_at) : null,
        author_login: author.login,
        repository_id: repository.id,
        org_id: effectiveOrgId,
      },
      { conflictPaths: ['github_id'] },
    );

    // Fetch and persist commits for this PR
    await this.fetchAndPersistCommits(repository, effectiveOrgId, pr.number);
  }

  private async fetchAndPersistCommits(
    repository: RepoEntity,
    orgId: string,
    prNumber: number,
  ): Promise<void> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org?.installation_id) return;

    const prEntity = await this.prRepo.findOne({
      where: { number: prNumber, repository_id: repository.id },
    });
    if (!prEntity) return;

    try {
      const octokit = await this.githubAppService.getOctokitForInstallation(
        Number(org.installation_id),
      );
      const [owner, repoName] = repository.full_name.split('/');

      let page = 1;
      const maxPages = 10;

      while (page <= maxPages) {
        const commits = await this.rateLimitService.withRateLimitHandling(async () => {
          const res = await octokit.rest.pulls.listCommits({
            owner,
            repo: repoName,
            pull_number: prNumber,
            per_page: 100,
            page,
          });
          return { data: res.data, headers: res.headers as Record<string, string> };
        });

        for (const commit of commits) {
          const authorLogin = commit.author?.login ?? commit.commit?.author?.name ?? null;
          const authorGithubId = commit.author?.id ?? null;

          let authorId: string | null = null;
          if (authorGithubId) {
            const dev = await this.developerRepo.findOne({ where: { github_id: authorGithubId } });
            authorId = dev?.id ?? null;
          }

          await this.commitRepo.upsert(
            {
              sha: commit.sha,
              message: commit.commit?.message?.substring(0, 2000) ?? null,
              committed_at: new Date(
                commit.commit?.author?.date ?? commit.commit?.committer?.date ?? Date.now(),
              ),
              additions: commit.stats?.additions ?? 0,
              deletions: commit.stats?.deletions ?? 0,
              author_login: authorLogin,
              author_id: authorId,
              pull_request_id: prEntity.id,
              org_id: orgId,
            },
            { conflictPaths: ['sha'] },
          );
        }

        if (commits.length < 100) break;
        page++;
      }
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          severity: 'WARN',
          message: 'webhook_commit_fetch_failed',
          pr_number: prNumber,
          repo: repository.full_name,
          error: (err as Error).message,
        }),
      );
    }
  }

  private async processPullRequestReviewEvent(
    payload: Record<string, unknown>,
    orgId: string | null,
  ): Promise<void> {
    const review = payload['review'] as GitHubReviewPayload;
    const reviewer = review.user;

    // Upsert reviewer developer
    await this.developerRepo.upsert(
      {
        github_id: reviewer.id,
        login: reviewer.login,
      },
      { conflictPaths: ['github_id'] },
    );

    // Upsert review (requires pull_request to exist; if not found, processor will retry)
    await this.reviewRepo.upsert(
      {
        github_id: review.id,
        state: review.state as 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED',
        body: review.body,
        submitted_at_github: new Date(review.submitted_at),
        reviewer_login: reviewer.login,
        org_id: orgId ?? '00000000-0000-0000-0000-000000000000',
      },
      { conflictPaths: ['github_id'] },
    );
  }

  private async processDeploymentEvent(
    payload: Record<string, unknown>,
    orgId: string | null,
  ): Promise<void> {
    const deployment = payload['deployment'] as GitHubDeploymentPayload | undefined;
    const repo = payload['repository'] as GitHubRepositoryPayload | undefined;
    if (!deployment?.id || !repo?.id) {
      throw new Error('Invalid deployment webhook payload');
    }

    const repository = await this.resolveRepository(repo.id);
    const effectiveOrgId = repository?.org_id ?? orgId;
    if (!repository || !effectiveOrgId) {
      throw new Error(`Repository context missing for deployment webhook (repo_github_id=${repo.id})`);
    }

    const existing = await this.deploymentRepo.findOne({ where: { github_id: deployment.id } });
    const githubCreatedAt = deployment.created_at ? new Date(deployment.created_at) : new Date();

    await this.deploymentRepo.upsert(
      {
        github_id: deployment.id,
        repository_id: repository.id,
        org_id: effectiveOrgId,
        environment: deployment.environment ?? null,
        sha: deployment.sha ?? null,
        ref: deployment.ref ?? null,
        task: deployment.task ?? null,
        github_created_at: githubCreatedAt,
        latest_status_state: existing?.latest_status_state ?? null,
        latest_status_at: existing?.latest_status_at ?? null,
        status_payload_json: (existing?.status_payload_json ?? null) as any,
      },
      { conflictPaths: ['github_id'] },
    );
  }

  private async processDeploymentStatusEvent(
    payload: Record<string, unknown>,
    orgId: string | null,
  ): Promise<void> {
    const status = payload['deployment_status'] as GitHubDeploymentStatusPayload | undefined;
    const deployment = payload['deployment'] as GitHubDeploymentPayload | undefined;
    const repo = payload['repository'] as GitHubRepositoryPayload | undefined;
    const deploymentGithubId = status?.deployment?.id ?? deployment?.id;

    if (!deploymentGithubId || !repo?.id || !status?.state) {
      throw new Error('Invalid deployment_status webhook payload');
    }

    const repository = await this.resolveRepository(repo.id);
    const effectiveOrgId = repository?.org_id ?? orgId;
    if (!repository || !effectiveOrgId) {
      throw new Error(`Repository context missing for deployment_status webhook (repo_github_id=${repo.id})`);
    }

    const statusAtRaw = status.created_at ?? status.updated_at;
    const statusAt = statusAtRaw ? new Date(statusAtRaw) : new Date();
    const existing = await this.deploymentRepo.findOne({ where: { github_id: deploymentGithubId } });

    if (existing) {
      const shouldUpdate =
        !existing.latest_status_at || statusAt.getTime() >= existing.latest_status_at.getTime();

      if (!shouldUpdate) return;

      existing.repository_id = repository.id;
      existing.org_id = effectiveOrgId;
      existing.latest_status_state = this.normalizeDeploymentStatusState(status.state);
      existing.latest_status_at = statusAt;
      existing.status_payload_json = status as unknown as Record<string, unknown>;
      await this.deploymentRepo.save(existing);
      return;
    }

    await this.deploymentRepo.upsert(
      {
        github_id: deploymentGithubId,
        repository_id: repository.id,
        org_id: effectiveOrgId,
        environment: deployment?.environment ?? null,
        sha: deployment?.sha ?? null,
        ref: deployment?.ref ?? null,
        task: deployment?.task ?? null,
        github_created_at: deployment?.created_at ? new Date(deployment.created_at) : statusAt,
        latest_status_state: this.normalizeDeploymentStatusState(status.state),
        latest_status_at: statusAt,
        status_payload_json: (status as unknown as Record<string, unknown>) as any,
      },
      { conflictPaths: ['github_id'] },
    );
  }

  private async resolveRepository(githubRepoId?: number): Promise<RepoEntity | null> {
    if (!githubRepoId) return null;
    return this.repoRepo.findOne({ where: { github_id: githubRepoId } });
  }

  private normalizeDeploymentStatusState(state: string): Deployment['latest_status_state'] {
    const normalized = state.toLowerCase();
    return DEPLOYMENT_STATUS_STATES.has(normalized)
      ? normalized as Deployment['latest_status_state']
      : null;
  }
}
