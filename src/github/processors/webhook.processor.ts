import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepo } from 'typeorm';
import { Job } from 'bullmq';
import { WebhookDelivery } from '../entities/webhook-delivery.entity';
import { PullRequest } from '../entities/pull-request.entity';
import { Developer } from '../entities/developer.entity';
import { Review } from '../entities/review.entity';
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
    const author = pr.user;

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
        org_id: orgId ?? '00000000-0000-0000-0000-000000000000',
      },
      { conflictPaths: ['github_id'] },
    );
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
}
