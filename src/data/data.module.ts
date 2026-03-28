import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from '../github/entities/repository.entity';
import { Developer } from '../github/entities/developer.entity';
import { PullRequest } from '../github/entities/pull-request.entity';
import { DataController } from './data.controller';
import { DataService } from './data.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Repository, Developer, PullRequest]),
    AuthModule,
  ],
  controllers: [DataController],
  providers: [DataService],
  exports: [DataService],
})
export class DataModule {}
