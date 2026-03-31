import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor(private configService: ConfigService) {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');
    const redisTls = this.configService.get<string>('REDIS_TLS', 'false') === 'true';

    if (isProduction && !redisPassword) {
      throw new Error('[SECURITY] REDIS_PASSWORD is required in production. Refusing to start with unauthenticated Redis.');
    }

    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: redisPassword || undefined,
      tls: redisTls ? {} : undefined,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      this.logger.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          severity: 'INFO',
          message: 'Redis connected',
        }),
      );
    });

    this.client.on('error', (err: Error) => {
      this.logger.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          severity: 'ERROR',
          message: 'Redis connection error',
          error: err.message,
        }),
      );
    });
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, expireSeconds?: number): Promise<void> {
    if (expireSeconds !== undefined) {
      await this.client.set(key, value, 'EX', expireSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async setNx(key: string, value: string, expireSeconds: number): Promise<boolean> {
    const result = await this.client.set(key, value, 'EX', expireSeconds, 'NX');
    return result === 'OK'; // true if key was set (new), false if already existed
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }
}
