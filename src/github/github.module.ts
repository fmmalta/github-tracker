import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Organization } from './entities/organization.entity';
import { Repository } from './entities/repository.entity';
import { Developer } from './entities/developer.entity';
import { PullRequest } from './entities/pull-request.entity';
import { Review } from './entities/review.entity';
import { Commit } from './entities/commit.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { SyncJob } from './entities/sync-job.entity';
import { GitHubAppService } from './services/github-app.service';
import { RateLimitService } from './services/rate-limit.service';
import { WebhookService } from './services/webhook.service';
import { BackfillService } from './services/backfill.service';
import { WebhookController } from './controllers/webhook.controller';
import { GithubAppController } from './controllers/github-app.controller';
import { WebhookProcessor } from './processors/webhook.processor';
import { BackfillProcessor } from './processors/backfill.processor';
import { WEBHOOK_QUEUE, BACKFILL_QUEUE } from '../queue/queue.service';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization, Repository, Developer, PullRequest,
      Review, Commit, WebhookDelivery, SyncJob,
    ]),
    BullModule.registerQueue(
      { name: WEBHOOK_QUEUE },
      { name: BACKFILL_QUEUE },
    ),
    MetricsModule,
  ],
  controllers: [WebhookController, GithubAppController],
  providers: [
    GitHubAppService, RateLimitService,
    WebhookService, BackfillService,
    WebhookProcessor, BackfillProcessor,
  ],
  exports: [
    TypeOrmModule, GitHubAppService, RateLimitService,
    WebhookService, BackfillService,
  ],
})
export class GithubModule {}
