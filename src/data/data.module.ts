import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from '../github/entities/repository.entity';
import { Developer } from '../github/entities/developer.entity';
import { PullRequest } from '../github/entities/pull-request.entity';
import { Organization } from '../github/entities/organization.entity';
import { SyncJob } from '../github/entities/sync-job.entity';
import { WebhookDelivery } from '../github/entities/webhook-delivery.entity';
import { Review } from '../github/entities/review.entity';
import { DataController } from './data.controller';
import { DataService } from './data.service';
import { AuthModule } from '../auth/auth.module';
import { GithubModule } from '../github/github.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Repository, Developer, PullRequest, Organization, SyncJob, WebhookDelivery, Review]),
    AuthModule,
    GithubModule,
    RedisModule,
  ],
  controllers: [DataController],
  providers: [DataService],
  exports: [DataService],
})
export class DataModule {}
