import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { GithubModule } from './github/github.module';
import { RedisModule } from './redis/redis.module';
import { QueueModule } from './queue/queue.module';
import { AuthModule } from './auth/auth.module';
import { MetricsModule } from './metrics/metrics.module';
import { DataModule } from './data/data.module';
import { JwtGuard } from './auth/guards/jwt.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { AuditMiddleware } from './common/middleware/audit.middleware';
import { InactivityMiddleware } from './common/middleware/inactivity.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    DatabaseModule,
    QueueModule,
    GithubModule,
    AuthModule,
    MetricsModule,
    DataModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtGuard },   // Global JWT guard — @Public() routes bypass it
    { provide: APP_GUARD, useClass: RolesGuard }, // Global roles guard
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuditMiddleware, InactivityMiddleware)
      .forRoutes('*');  // Apply to all routes
  }
}
