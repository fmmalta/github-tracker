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
import { WebhookController } from './controllers/webhook.controller';
import { WEBHOOK_QUEUE } from '../queue/queue.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization, Repository, Developer, PullRequest,
      Review, Commit, WebhookDelivery, SyncJob,
    ]),
    BullModule.registerQueue({ name: WEBHOOK_QUEUE }),
  ],
  controllers: [WebhookController],
  providers: [GitHubAppService, RateLimitService, WebhookService],
  exports: [TypeOrmModule, GitHubAppService, RateLimitService, WebhookService],
})
export class GithubModule {}
