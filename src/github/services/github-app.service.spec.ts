// Note: @octokit/app is mapped to src/__mocks__/@octokit/app.ts via jest.config.ts moduleNameMapper
// because it's an ESM-only package that Jest (CommonJS) cannot load directly.
import { Test, TestingModule } from '@nestjs/testing';
import { GitHubAppService } from './github-app.service';
import { RedisService } from '../../redis/redis.service';
import { ConfigService } from '@nestjs/config';

const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      GITHUB_APP_ID: '123',
      GITHUB_PRIVATE_KEY: 'mock-pem-key',
    };
    return config[key];
  }),
};

describe('GitHubAppService', () => {
  let service: GitHubAppService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubAppService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();
    service = module.get<GitHubAppService>(GitHubAppService);
  });

  it('returns cached token when Redis cache hit', async () => {
    mockRedisService.get.mockResolvedValue(JSON.stringify({ token: 'cached-token-123' }));
    const token = await service.getInstallationToken(456);
    expect(token).toBe('cached-token-123');
    expect(mockRedisService.set).not.toHaveBeenCalled();
  });

  it('caches token with 59-minute TTL on cache miss', async () => {
    mockRedisService.get.mockResolvedValue(null);
    // Mock the octokit installation call
    jest.spyOn(service as any, 'fetchInstallationToken').mockResolvedValue('fresh-token-xyz');
    await service.getInstallationToken(456);
    expect(mockRedisService.set).toHaveBeenCalledWith(
      'github-token:456',
      expect.stringContaining('fresh-token-xyz'),
      59 * 60,
    );
  });
});
