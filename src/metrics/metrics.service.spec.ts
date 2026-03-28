import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { MetricsService } from './metrics.service';
import { DailyMetricsRepository } from './repositories/daily-metrics.repository';
import { DailyMetric } from './entities/daily-metric.entity';
import { SyncJob } from '../github/entities/sync-job.entity';
import { METRICS_QUEUE } from './processors/nightly-aggregation.processor';
import { DataSource } from 'typeorm';

describe('MetricsService - getHealth()', () => {
  let service: MetricsService;

  const mockQueue = {
    getWaitingCount: jest.fn(),
    getActiveCount: jest.fn(),
    getDelayedCount: jest.fn(),
    getFailedCount: jest.fn(),
    getDelayed: jest.fn(),
  };

  const mockSyncJobRepo = {
    findOne: jest.fn(),
  };

  const mockDailyMetricRepo = {
    findOne: jest.fn(),
  };

  const mockDailyMetricsRepository = {
    findByDateRange: jest.fn(),
  };

  const mockDataSource = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        { provide: DailyMetricsRepository, useValue: mockDailyMetricsRepository },
        { provide: getRepositoryToken(SyncJob), useValue: mockSyncJobRepo },
        { provide: getRepositoryToken(DailyMetric), useValue: mockDailyMetricRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: getQueueToken(METRICS_QUEUE), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it('Test 1: getHealth() returns queue fields as numbers (pending, active, delayed, failed)', async () => {
    mockQueue.getWaitingCount.mockResolvedValue(5);
    mockQueue.getActiveCount.mockResolvedValue(2);
    mockQueue.getDelayedCount.mockResolvedValue(3);
    mockQueue.getFailedCount.mockResolvedValue(0);
    mockQueue.getDelayed.mockResolvedValue([]);
    mockSyncJobRepo.findOne.mockResolvedValue(null);
    mockDailyMetricRepo.findOne.mockResolvedValue(null);

    const result = await service.getHealth();

    expect(result.queue.pending).toBe(5);
    expect(result.queue.active).toBe(2);
    expect(result.queue.delayed).toBe(3);
    expect(result.queue.failed).toBe(0);
    expect(typeof result.queue.pending).toBe('number');
    expect(typeof result.queue.active).toBe('number');
    expect(typeof result.queue.delayed).toBe('number');
    expect(typeof result.queue.failed).toBe('number');
  });

  it('Test 2: getHealth() returns oldest_pending_age_seconds as null when no delayed jobs', async () => {
    mockQueue.getWaitingCount.mockResolvedValue(0);
    mockQueue.getActiveCount.mockResolvedValue(0);
    mockQueue.getDelayedCount.mockResolvedValue(0);
    mockQueue.getFailedCount.mockResolvedValue(0);
    mockQueue.getDelayed.mockResolvedValue([]);
    mockSyncJobRepo.findOne.mockResolvedValue(null);
    mockDailyMetricRepo.findOne.mockResolvedValue(null);

    const result = await service.getHealth();

    expect(result.queue.oldest_pending_age_seconds).toBeNull();
  });

  it('Test 2b: getHealth() returns oldest_pending_age_seconds as a number when delayed jobs exist', async () => {
    const pastTimestamp = Date.now() - 60000; // 60 seconds ago
    mockQueue.getWaitingCount.mockResolvedValue(1);
    mockQueue.getActiveCount.mockResolvedValue(0);
    mockQueue.getDelayedCount.mockResolvedValue(1);
    mockQueue.getFailedCount.mockResolvedValue(0);
    mockQueue.getDelayed.mockResolvedValue([{ timestamp: pastTimestamp }]);
    mockSyncJobRepo.findOne.mockResolvedValue(null);
    mockDailyMetricRepo.findOne.mockResolvedValue(null);

    const result = await service.getHealth();

    expect(result.queue.oldest_pending_age_seconds).not.toBeNull();
    expect(typeof result.queue.oldest_pending_age_seconds).toBe('number');
    expect(result.queue.oldest_pending_age_seconds).toBeGreaterThanOrEqual(59);
  });

  it('Test 3: getHealth() status is degraded when queue.failed > 0', async () => {
    mockQueue.getWaitingCount.mockResolvedValue(0);
    mockQueue.getActiveCount.mockResolvedValue(0);
    mockQueue.getDelayedCount.mockResolvedValue(0);
    mockQueue.getFailedCount.mockResolvedValue(3);
    mockQueue.getDelayed.mockResolvedValue([]);
    mockSyncJobRepo.findOne.mockResolvedValue(null);
    mockDailyMetricRepo.findOne.mockResolvedValue(null);

    const result = await service.getHealth();

    expect(result.status).toBe('degraded');
  });

  it('Test 3b: getHealth() status is ok when queue.failed === 0', async () => {
    mockQueue.getWaitingCount.mockResolvedValue(0);
    mockQueue.getActiveCount.mockResolvedValue(0);
    mockQueue.getDelayedCount.mockResolvedValue(0);
    mockQueue.getFailedCount.mockResolvedValue(0);
    mockQueue.getDelayed.mockResolvedValue([]);
    mockSyncJobRepo.findOne.mockResolvedValue(null);
    mockDailyMetricRepo.findOne.mockResolvedValue(null);

    const result = await service.getHealth();

    expect(result.status).toBe('ok');
  });

  it('Test 4: getHealth() includes last_sync and last_metrics_aggregation fields', async () => {
    mockQueue.getWaitingCount.mockResolvedValue(0);
    mockQueue.getActiveCount.mockResolvedValue(0);
    mockQueue.getDelayedCount.mockResolvedValue(0);
    mockQueue.getFailedCount.mockResolvedValue(0);
    mockQueue.getDelayed.mockResolvedValue([]);

    const syncJob = {
      finished_at: new Date('2026-03-27T02:00:00Z'),
      type: 'scheduled',
      status: 'success',
    };
    const dailyMetric = {
      created_at: new Date('2026-03-27T02:05:00Z'),
    };

    mockSyncJobRepo.findOne.mockResolvedValue(syncJob);
    mockDailyMetricRepo.findOne.mockResolvedValue(dailyMetric);

    const result = await service.getHealth();

    expect(result.last_sync).toBeDefined();
    expect(result.last_sync?.completed_at).toBe('2026-03-27T02:00:00.000Z');
    expect(result.last_sync?.type).toBe('scheduled');
    expect(result.last_sync?.status).toBe('success');
    expect(result.last_metrics_aggregation).toBe('2026-03-27T02:05:00.000Z');
  });
});
