import { Test, TestingModule } from '@nestjs/testing';
import { BackfillService } from '../src/github/services/backfill.service';
import { RateLimitService } from '../src/github/services/rate-limit.service';
import { GitHubAppService } from '../src/github/services/github-app.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Organization } from '../src/github/entities/organization.entity';
import { Repository as RepoEntity } from '../src/github/entities/repository.entity';
import { Developer } from '../src/github/entities/developer.entity';
import { PullRequest } from '../src/github/entities/pull-request.entity';
import { Review } from '../src/github/entities/review.entity';
import { SyncJob } from '../src/github/entities/sync-job.entity';

// Helpers
function makePr(id: number, daysAgo: number) {
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - daysAgo);
  return {
    id,
    number: id,
    title: `PR ${id}`,
    body: null,
    state: 'open',
    base: { ref: 'main' },
    head: { ref: `feature/${id}` },
    additions: 10,
    deletions: 5,
    changed_files: 2,
    created_at: createdAt.toISOString(),
    merged_at: null,
    closed_at: null,
    user: { id: 111, login: 'dev1', avatar_url: null },
  };
}

const mockOrgRepo = { findOne: jest.fn() };
const mockRepoRepo = { upsert: jest.fn() };
const mockDeveloperRepo = { upsert: jest.fn() };
const mockPrRepo = { upsert: jest.fn() };
const mockReviewRepo = { upsert: jest.fn() };
const mockSyncJobRepo = { findOne: jest.fn(), save: jest.fn() };

describe('BackfillService (integration)', () => {
  let service: BackfillService;
  let mockOctokit: jest.Mocked<{
    rest: {
      repos: { listForOrg: jest.Mock; get: jest.Mock };
      pulls: { list: jest.Mock; listReviews: jest.Mock };
    };
  }>;

  const mockRateLimitService = {
    withRateLimitHandling: jest.fn().mockImplementation(async (fn: () => Promise<unknown>) => {
      const result = await fn() as { data: unknown; headers: Record<string, string> };
      return result.data;
    }),
  };

  const mockGitHubAppService = {
    getInstallationToken: jest.fn().mockResolvedValue('test-token'),
    getOctokitForInstallation: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockOctokit = {
      rest: {
        repos: {
          listForOrg: jest.fn(),
          get: jest.fn().mockResolvedValue({
            data: { open_issues_count: 3 },
            headers: { 'x-ratelimit-remaining': '4999' },
          }),
        },
        pulls: {
          list: jest.fn(),
          listReviews: jest.fn().mockResolvedValue({
            data: [],
            headers: { 'x-ratelimit-remaining': '4999' },
          }),
        },
      },
    };

    mockGitHubAppService.getOctokitForInstallation.mockResolvedValue(mockOctokit);
    mockOrgRepo.findOne.mockResolvedValue({ id: 'org-uuid', login: 'test-org' });
    mockRepoRepo.upsert.mockResolvedValue({});
    mockDeveloperRepo.upsert.mockResolvedValue({});
    mockPrRepo.upsert.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackfillService,
        { provide: GitHubAppService, useValue: mockGitHubAppService },
        { provide: RateLimitService, useValue: mockRateLimitService },
        { provide: getRepositoryToken(Organization), useValue: mockOrgRepo },
        { provide: getRepositoryToken(RepoEntity), useValue: mockRepoRepo },
        { provide: getRepositoryToken(Developer), useValue: mockDeveloperRepo },
        { provide: getRepositoryToken(PullRequest), useValue: mockPrRepo },
        { provide: getRepositoryToken(Review), useValue: mockReviewRepo },
        { provide: getRepositoryToken(SyncJob), useValue: mockSyncJobRepo },
      ],
    }).compile();

    service = module.get<BackfillService>(BackfillService);
  });

  describe('QA-03: Cursor-based pagination stops at 90-day cutoff', () => {
    it('stops fetching PRs older than 90 days', async () => {
      // First page: 2 PRs within 90 days, 1 beyond
      const recentPrs = [makePr(1, 30), makePr(2, 60)];
      const oldPr = makePr(3, 100); // Beyond 90-day cutoff

      mockOctokit.rest.repos.listForOrg.mockResolvedValue({
        data: [{ id: 555, name: 'test-repo', full_name: 'org/test-repo', private: false, language: 'TypeScript' }],
        headers: {},
      });

      mockOctokit.rest.pulls.list
        .mockResolvedValueOnce({
          data: [...recentPrs, oldPr],
          headers: { link: '' }, // No next page
        });

      const result = await service.backfillOrganization(1, 'test-org', 'job-1');

      expect(result.prsSynced).toBe(2); // Only PRs within 90 days
      expect(mockPrRepo.upsert).toHaveBeenCalledTimes(2);
    });

    it('follows Link header cursor to next page (not page offset)', async () => {
      // All 100 PRs on page 1 are within 90 days (days 1-89), triggering next page fetch
      const page1Prs = Array.from({ length: 100 }, (_, i) => makePr(i + 1, (i % 89) + 1));
      const page2Prs = [makePr(101, 5)];

      mockOctokit.rest.repos.listForOrg.mockResolvedValue({
        data: [{ id: 555, name: 'test-repo', full_name: 'org/test-repo', private: false, language: null }],
        headers: {},
      });

      mockOctokit.rest.pulls.list
        .mockResolvedValueOnce({
          data: page1Prs,
          headers: {
            link: '<https://api.github.com/repos/org/test-repo/pulls?after=cursor-abc>; rel="next"',
          },
        })
        .mockResolvedValueOnce({
          data: page2Prs,
          headers: { link: '' },
        });

      await service.backfillOrganization(1, 'test-org', 'job-1');

      // Verify second call used 'after' cursor param from Link header
      const secondCallParams = mockOctokit.rest.pulls.list.mock.calls[1][0] as Record<string, unknown>;
      expect(secondCallParams).toMatchObject({ after: 'cursor-abc' });
    });
  });

  describe('QA-03: Completeness validation', () => {
    it('throws when 0 PRs fetched but GitHub shows open issues exist', async () => {
      mockOctokit.rest.repos.listForOrg.mockResolvedValue({
        data: [{ id: 555, name: 'test-repo', full_name: 'org/test-repo', private: false, language: null }],
        headers: {},
      });

      // All PRs are older than 90 days → nothing fetched
      const oldPr = makePr(1, 100);
      mockOctokit.rest.pulls.list.mockResolvedValue({
        data: [oldPr],
        headers: { link: '' },
      });

      // GitHub says there are 5 open issues (PRs), but we fetched 0
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: { open_issues_count: 5 },
        headers: {},
      });

      await expect(
        service.backfillOrganization(1, 'test-org', 'job-1'),
      ).rejects.toThrow('Backfill validation failed');
    });
  });

  describe('QA-03: Rate-limit handling during backfill', () => {
    it('calls withRateLimitHandling for every GitHub API call', async () => {
      mockOctokit.rest.repos.listForOrg.mockResolvedValue({
        data: [{ id: 555, name: 'test-repo', full_name: 'org/test-repo', private: false, language: null }],
        headers: {},
      });
      mockOctokit.rest.pulls.list.mockResolvedValue({
        data: [makePr(1, 30)],
        headers: { link: '' },
      });

      await service.backfillOrganization(1, 'test-org', 'job-1');

      // Every GitHub API call should go through withRateLimitHandling
      expect(mockRateLimitService.withRateLimitHandling).toHaveBeenCalled();
      expect(mockRateLimitService.withRateLimitHandling.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });
});
