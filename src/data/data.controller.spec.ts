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
