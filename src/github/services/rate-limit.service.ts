import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

interface ApiResponse<T> {
  data: T;
  headers: Record<string, string>;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(private readonly redisService: RedisService) {}

  async withRateLimitHandling<T>(
    apiCall: () => Promise<ApiResponse<T>>,
    maxRetries: number = 3,
  ): Promise<T> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < maxRetries) {
      try {
        const { data, headers } = await apiCall();

        // Track rate-limit state in shared Redis counter (shared across all BullMQ workers)
        const remaining = parseInt(headers['x-ratelimit-remaining'] ?? '5000', 10);
        const resetAt = headers['x-ratelimit-reset'] ?? String(Math.floor(Date.now() / 1000));

        await this.redisService.set('github-rate-limit:remaining', String(remaining));
        await this.redisService.set('github-rate-limit:reset', resetAt);

        // Adaptive backoff when approaching primary rate limit (5000 req/hr)
        if (remaining < 500) {
          const backoffMs = this.calculateAdaptiveBackoff(remaining);
          this.logger.warn(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              severity: 'WARN',
              message: 'rate_limit_approaching',
              remaining,
              reset_at: resetAt,
              adaptive_backoff_ms: backoffMs,
            }),
          );
          await this.sleep(backoffMs);
        }

        return data;
      } catch (err: unknown) {
        const error = err as { status?: number; response?: { headers?: Record<string, string> }; message?: string };

        if (error.status === 403 || error.status === 429) {
          const retryAfterHeader = error.response?.headers?.['retry-after'];
          const backoffMs = this.calculateExponentialBackoff(attempt, retryAfterHeader);

          this.logger.warn(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              severity: 'WARN',
              message: 'rate_limit_hit',
              status: error.status,
              attempt: attempt + 1,
              max_retries: maxRetries,
              backoff_ms: backoffMs,
            }),
          );

          // AUDIT-08: Log retry attempt
          this.logger.warn(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              severity: 'WARN',
              message: 'retry_attempt',
              attempt_count: attempt + 1,
              backoff_ms: backoffMs,
            }),
          );

          lastError = new Error(error.message ?? 'Rate limit error');
          attempt++;
          await this.sleep(backoffMs);
          continue;
        }

        // Non-rate-limit errors fail immediately
        throw err;
      }
    }

    throw new Error(
      `Rate-limit retry exhausted after ${maxRetries} attempts. Last error: ${lastError?.message ?? 'unknown'}`,
    );
  }

  private calculateExponentialBackoff(attempt: number, retryAfter?: string): number {
    if (retryAfter !== undefined) {
      return Math.min(parseInt(retryAfter, 10) * 1000, 60_000);
    }
    // Exponential backoff: 1s, 2s, 4s, 8s... capped at 60s
    const backoffMs = Math.min(1000 * Math.pow(2, attempt), 60_000);
    // Add 10% jitter to prevent thundering herd across concurrent workers
    const jitter = Math.random() * backoffMs * 0.1;
    return Math.floor(backoffMs + jitter);
  }

  private calculateAdaptiveBackoff(remaining: number): number {
    // Proportional slow-down: < 10% remaining → 500ms, otherwise 100ms
    const percentRemaining = (remaining / 5000) * 100;
    return percentRemaining < 10 ? 500 : 100;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
