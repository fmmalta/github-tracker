import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto';
import { ConfigModule } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WebhookController } from '../src/github/controllers/webhook.controller';
import { WebhookService } from '../src/github/services/webhook.service';
import { WebhookDelivery } from '../src/github/entities/webhook-delivery.entity';
import { RedisService } from '../src/redis/redis.service';

const WEBHOOK_SECRET = 'test-secret-1234567890abcdef1234567890';

function generateSignature(body: string): string {
  return `sha256=${crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex')}`;
}

const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
  setNx: jest.fn(),
  del: jest.fn(),
  client: { set: jest.fn() },
};

const mockDeliveryRepo = {
  create: jest.fn().mockImplementation((data: Record<string, unknown>) => data),
  save: jest.fn().mockResolvedValue({ id: 'uuid-1' }),
  findOne: jest.fn(),
};

const mockWebhookQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-1' }),
};

describe('WebhookController (integration)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ GITHUB_WEBHOOK_SECRET: WEBHOOK_SECRET })],
        }),
      ],
      controllers: [WebhookController],
      providers: [
        WebhookService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: getRepositoryToken(WebhookDelivery), useValue: mockDeliveryRepo },
        { provide: 'BullQueue_webhooks', useValue: mockWebhookQueue },
      ],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('QA-02: HMAC Verification', () => {
    it('rejects webhook with missing signature (401)', async () => {
      const payload = JSON.stringify({ action: 'opened' });
      await request(app.getHttpServer())
        .post('/webhooks/github')
        .set('x-github-delivery', 'delivery-001')
        .set('x-github-event', 'pull_request')
        .set('content-type', 'application/json')
        .send(payload)
        .expect(401);
    });

    it('rejects webhook with wrong signature (401)', async () => {
      const payload = JSON.stringify({ action: 'opened' });
      await request(app.getHttpServer())
        .post('/webhooks/github')
        .set('x-hub-signature-256', 'sha256=wrongsignature')
        .set('x-github-delivery', 'delivery-002')
        .set('x-github-event', 'pull_request')
        .set('content-type', 'application/json')
        .send(payload)
        .expect(401);
    });

    it('accepts webhook with valid HMAC signature (200)', async () => {
      mockRedisService.setNx.mockResolvedValue(true); // New delivery
      const payload = JSON.stringify({ action: 'opened', pull_request: { id: 1, number: 1, user: { id: 1, login: 'dev' } } });
      const signature = generateSignature(payload);

      const response = await request(app.getHttpServer())
        .post('/webhooks/github')
        .set('x-hub-signature-256', signature)
        .set('x-github-delivery', 'delivery-003')
        .set('x-github-event', 'pull_request')
        .set('content-type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toMatchObject({ status: 'queued', deliveryId: 'delivery-003' });
    });
  });

  describe('QA-02: Idempotency (X-GitHub-Delivery deduplication)', () => {
    it('returns 200 with isDuplicate=true for duplicate delivery (no re-queue)', async () => {
      mockRedisService.setNx.mockResolvedValue(false); // Already exists = duplicate
      const payload = JSON.stringify({ action: 'opened' });
      const signature = generateSignature(payload);

      const response = await request(app.getHttpServer())
        .post('/webhooks/github')
        .set('x-hub-signature-256', signature)
        .set('x-github-delivery', 'delivery-duplicate-001')
        .set('x-github-event', 'pull_request')
        .set('content-type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toMatchObject({ status: 'acknowledged', isDuplicate: true });
      expect(mockWebhookQueue.add).not.toHaveBeenCalled();
    });

    it('inserts webhook_deliveries row before queuing (audit trail)', async () => {
      mockRedisService.setNx.mockResolvedValue(true);
      const payload = JSON.stringify({ action: 'opened' });
      const signature = generateSignature(payload);

      await request(app.getHttpServer())
        .post('/webhooks/github')
        .set('x-hub-signature-256', signature)
        .set('x-github-delivery', 'delivery-004')
        .set('x-github-event', 'push')
        .set('content-type', 'application/json')
        .send(payload)
        .expect(200);

      expect(mockDeliveryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          delivery_id: 'delivery-004',
          event_type: 'push',
          status: 'queued',
        }),
      );
    });

    it('returns 503 when Redis is unavailable (fail-safe)', async () => {
      mockRedisService.setNx.mockRejectedValue(new Error('Redis connection refused'));
      const payload = JSON.stringify({ action: 'opened' });
      const signature = generateSignature(payload);

      await request(app.getHttpServer())
        .post('/webhooks/github')
        .set('x-hub-signature-256', signature)
        .set('x-github-delivery', 'delivery-005')
        .set('x-github-event', 'pull_request')
        .set('content-type', 'application/json')
        .send(payload)
        .expect(503);
    });
  });
});
