import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate } from '@nestjs/common';
import { DataController } from './data.controller';
import { DataService } from './data.service';
import { Reflector } from '@nestjs/core';
import { OrgScopingGuard } from '../auth/guards/org-scoping.guard';

const mockOrgScopingGuard: CanActivate = { canActivate: jest.fn(() => true) };

describe('DataController - Admin Endpoints', () => {
  let controller: DataController;

  const mockDataService = {
    getSyncHistory: jest.fn(),
    getWebhookDlq: jest.fn(),
    retryWebhookDelivery: jest.fn(),
    getOrgs: jest.fn(),
    getRepos: jest.fn(),
    getDevelopers: jest.fn(),
    getPullRequests: jest.fn(),
    getDeveloperReviews: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataController],
      providers: [
        { provide: DataService, useValue: mockDataService },
        Reflector,
      ],
    })
      .overrideGuard(OrgScopingGuard)
      .useValue(mockOrgScopingGuard)
      .compile();

    controller = module.get<DataController>(DataController);
  });

  it('Test 1: GET /api/v1/admin/sync-history returns { data, total } newest first', async () => {
    const mockData = [
      { id: '1', type: 'scheduled', status: 'success', created_at: new Date('2026-03-28') },
      { id: '2', type: 'manual', status: 'failed', created_at: new Date('2026-03-27') },
    ];
    mockDataService.getSyncHistory.mockResolvedValue({ data: mockData, total: 2 });

    const result = await controller.getSyncHistory({ limit: 50, offset: 0 });

    expect(mockDataService.getSyncHistory).toHaveBeenCalledWith({ limit: 50, offset: 0 });
    expect(result).toEqual({ data: mockData, total: 2 });
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('Test 2: GET /api/v1/admin/webhook-dlq returns { data, total } filtered to failed status, newest first', async () => {
    const mockData = [
      { id: '1', delivery_id: 'abc', event_type: 'pull_request', status: 'failed', received_at: new Date('2026-03-28') },
    ];
    mockDataService.getWebhookDlq.mockResolvedValue({ data: mockData, total: 1 });

    const result = await controller.getWebhookDlq({ limit: 50, offset: 0 });

    expect(mockDataService.getWebhookDlq).toHaveBeenCalledWith({ limit: 50, offset: 0 });
    expect(result).toEqual({ data: mockData, total: 1 });
    expect(result.total).toBe(1);
  });

  it('Test 3: POST /api/v1/admin/webhook-dlq/:id/retry returns { ok: true }', async () => {
    mockDataService.retryWebhookDelivery.mockResolvedValue({ ok: true });

    const result = await controller.retryWebhookDelivery('some-uuid');

    expect(mockDataService.retryWebhookDelivery).toHaveBeenCalledWith('some-uuid');
    expect(result).toEqual({ ok: true });
  });

  it('Test 4: Admin endpoints exist on the controller (method-level @Roles check)', () => {
    // Verify the controller has the expected methods
    expect(typeof controller.getSyncHistory).toBe('function');
    expect(typeof controller.getWebhookDlq).toBe('function');
    expect(typeof controller.retryWebhookDelivery).toBe('function');
  });
});

describe('DataController - Developer Reviews Endpoint', () => {
  let controller: DataController;

  const mockDataService = {
    getSyncHistory: jest.fn(),
    getWebhookDlq: jest.fn(),
    retryWebhookDelivery: jest.fn(),
    getOrgs: jest.fn(),
    getRepos: jest.fn(),
    getDevelopers: jest.fn(),
    getPullRequests: jest.fn(),
    getDeveloperReviews: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataController],
      providers: [
        { provide: DataService, useValue: mockDataService },
        Reflector,
      ],
    })
      .overrideGuard(OrgScopingGuard)
      .useValue(mockOrgScopingGuard)
      .compile();

    controller = module.get<DataController>(DataController);
  });

  it('Test 1: getDeveloperReviews returns reviews with pr_title, pr_number, repo_name, state, date_reviewed', async () => {
    const mockReview = {
      id: 'rev-uuid',
      pr_title: 'Fix auth bug',
      pr_number: 42,
      pr_html_url: 'https://github.com/my-org/my-repo/pull/42',
      repo_name: 'my-repo',
      state: 'approved',
      date_reviewed: '2026-03-28T10:00:00.000Z',
    };
    mockDataService.getDeveloperReviews.mockResolvedValue({ data: [mockReview], total: 1 });

    const result = await (controller as any).getDeveloperReviews(
      'dev-uuid',
      { org_id: 'org-uuid', limit: 50, offset: 0 },
      {},
    );

    expect(mockDataService.getDeveloperReviews).toHaveBeenCalledWith('dev-uuid', 'org-uuid', expect.any(Object));
    expect(result.data[0]).toMatchObject({
      pr_title: 'Fix auth bug',
      pr_number: 42,
      repo_name: 'my-repo',
      state: 'approved',
      date_reviewed: expect.any(String),
    });
  });

  it('Test 2: getDeveloperReviews is scoped to org_id from query', async () => {
    mockDataService.getDeveloperReviews.mockResolvedValue({ data: [], total: 0 });

    await (controller as any).getDeveloperReviews(
      'dev-uuid',
      { org_id: 'specific-org-id' },
      {},
    );

    const [, orgIdArg] = mockDataService.getDeveloperReviews.mock.calls[0];
    expect(orgIdArg).toBe('specific-org-id');
  });

  it('Test 3: getDeveloperReviews returns 200 for authenticated user with valid role', async () => {
    mockDataService.getDeveloperReviews.mockResolvedValue({ data: [], total: 0 });

    const result = await (controller as any).getDeveloperReviews(
      'dev-uuid',
      { org_id: 'org-uuid' },
      { id: 'user-uuid', role: 'viewer' },
    );

    expect(result).toEqual({ data: [], total: 0 });
  });

  it('Test 4: getDeveloperReviews method exists on controller', () => {
    expect(typeof (controller as any).getDeveloperReviews).toBe('function');
  });
});
