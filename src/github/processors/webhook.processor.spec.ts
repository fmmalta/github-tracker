import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WebhookProcessor } from './webhook.processor';
import { WebhookDelivery } from '../entities/webhook-delivery.entity';
import { PullRequest } from '../entities/pull-request.entity';
import { Developer } from '../entities/developer.entity';
import { Review } from '../entities/review.entity';
import { Job } from 'bullmq';

const mockDeliveryRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
};
const mockPrRepo = {
  upsert: jest.fn(),
};
const mockDeveloperRepo = {
  upsert: jest.fn(),
};
const mockReviewRepo = {
  upsert: jest.fn(),
};

describe('WebhookProcessor', () => {
  let processor: WebhookProcessor;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookProcessor,
        { provide: getRepositoryToken(WebhookDelivery), useValue: mockDeliveryRepo },
        { provide: getRepositoryToken(PullRequest), useValue: mockPrRepo },
        { provide: getRepositoryToken(Developer), useValue: mockDeveloperRepo },
        { provide: getRepositoryToken(Review), useValue: mockReviewRepo },
      ],
    }).compile();
    processor = module.get<WebhookProcessor>(WebhookProcessor);
  });

  const makeJob = (data: object) => ({
    data,
    attemptsMade: 0,
  } as unknown as Job);

  it('processes pull_request opened event and upserts developer + PR', async () => {
    mockDeliveryRepo.findOne.mockResolvedValue({ id: 'uuid-1', status: 'queued', retry_count: 0 });
    mockDeliveryRepo.save.mockResolvedValue({});
    mockDeveloperRepo.upsert.mockResolvedValue({});
    mockPrRepo.upsert.mockResolvedValue({});

    const job = makeJob({
      deliveryId: 'delivery-123',
      eventType: 'pull_request',
      action: 'opened',
      payload: {
        action: 'opened',
        pull_request: {
          id: 999,
          number: 42,
          title: 'Fix bug',
          state: 'open',
          base: { ref: 'main' },
          head: { ref: 'fix/bug' },
          additions: 10,
          deletions: 5,
          changed_files: 2,
          created_at: '2026-01-01T00:00:00Z',
          merged_at: null,
          closed_at: null,
          user: { id: 111, login: 'dev1', name: 'Dev One', avatar_url: null },
          body: null,
        },
        repository: { id: 555, name: 'my-repo', full_name: 'org/my-repo', private: false },
        installation: { id: 1 },
      },
      receivedAt: new Date().toISOString(),
      orgId: null,
    });

    await processor.handleWebhookEvent(job);
    expect(mockDeveloperRepo.upsert).toHaveBeenCalled();
    expect(mockPrRepo.upsert).toHaveBeenCalled();
    expect(mockDeliveryRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success' }),
    );
  });

  it('marks delivery as failed on processing error and logs error', async () => {
    mockDeliveryRepo.findOne.mockResolvedValue({ id: 'uuid-2', status: 'queued', retry_count: 0 });
    mockDeliveryRepo.save.mockResolvedValue({});
    mockDeveloperRepo.upsert.mockRejectedValue(new Error('DB connection failed'));

    const job = makeJob({
      deliveryId: 'delivery-456',
      eventType: 'pull_request',
      action: 'opened',
      payload: { pull_request: { id: 1, number: 1, user: { id: 1, login: 'u' } } },
      receivedAt: new Date().toISOString(),
      orgId: null,
    });

    await expect(processor.handleWebhookEvent(job)).rejects.toThrow('DB connection failed');
    expect(mockDeliveryRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' }),
    );
  });
});
