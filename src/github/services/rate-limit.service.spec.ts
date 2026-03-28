import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitService } from './rate-limit.service';
import { RedisService } from '../../redis/redis.service';

const mockRedisService = { set: jest.fn(), get: jest.fn() };

describe('RateLimitService', () => {
  let service: RateLimitService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();
    service = module.get<RateLimitService>(RateLimitService);
    // Bypass actual sleep delays so tests run instantly
    jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
  });

  it('returns data on successful call', async () => {
    const mockCall = jest.fn().mockResolvedValue({
      data: { items: [1, 2, 3] },
      headers: { 'x-ratelimit-remaining': '4800', 'x-ratelimit-reset': '9999999999' },
    });
    const result = await service.withRateLimitHandling(mockCall);
    expect(result).toEqual({ items: [1, 2, 3] });
  });

  it('retries on 429 with exponential backoff', async () => {
    const error429 = Object.assign(new Error('rate limited'), { status: 429 });
    const mockCall = jest.fn()
      .mockRejectedValueOnce(error429)
      .mockResolvedValue({ data: 'success', headers: { 'x-ratelimit-remaining': '1000' } });

    const result = await service.withRateLimitHandling(mockCall);
    expect(result).toBe('success');
    expect(mockCall).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting all retries', async () => {
    const error403 = Object.assign(new Error('forbidden'), { status: 403 });
    const mockCall = jest.fn().mockRejectedValue(error403);

    await expect(
      service.withRateLimitHandling(mockCall, 2),
    ).rejects.toThrow('Rate-limit retry exhausted after 2 attempts');
  });
});
