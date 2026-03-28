import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class InactivityMiddleware implements NestMiddleware {
  private readonly SESSION_TTL = 2592000; // 30 days in seconds

  constructor(private readonly redisService: RedisService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const user = (req as any).user as { id?: string } | undefined;
    if (user?.id) {
      // Reset inactivity timer on every authenticated request
      await this.redisService.set(
        `session:${user.id}`,
        JSON.stringify({ userId: user.id, lastActivity: Date.now() }),
        this.SESSION_TTL,
      );
    }
    next();
  }
}
