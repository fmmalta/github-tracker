import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { Repository } from './entities/repository.entity';
import { Developer } from './entities/developer.entity';
import { PullRequest } from './entities/pull-request.entity';
import { Review } from './entities/review.entity';
import { Commit } from './entities/commit.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { SyncJob } from './entities/sync-job.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      Repository,
      Developer,
      PullRequest,
      Review,
      Commit,
      WebhookDelivery,
      SyncJob,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class GithubModule {}
