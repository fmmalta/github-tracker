import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepo } from 'typeorm';
import * as crypto from 'crypto';
import { RedisService } from '../../redis/redis.service';
import { WebhookDelivery } from '../entities/webhook-delivery.entity';
import { WEBHOOK_QUEUE, WEBHOOK_JOB } from '../../queue/queue.service';

export interface QueueWebhookPayload {
  deliveryId: string;
  eventType: string;
  action: string | null;
  payload: Record<string, unknown>;
  receivedAt: Date;
  orgId: string | null;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly redisService: RedisService,
    @InjectQueue(WEBHOOK_QUEUE)
    private readonly webhookQueue: Queue,
    @InjectRepository(WebhookDelivery)
    private readonly deliveryRepo: TypeOrmRepo<WebhookDelivery>,
  ) {}

  verifySignature(rawBody: Buffer, signature: string, secret: string): boolean {
    if (!signature || !signature.startsWith('sha256=')) {
      return false;
    }
    const expectedSig = `sha256=${crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')}`;

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSig),
      );
    } catch {
      return false;
    }
  }

  async checkAndMarkDelivery(deliveryId: string): Promise<boolean> {
    const key = `webhook-delivery:${deliveryId}`;
    const ttlSeconds = 24 * 60 * 60; // 24 hours — GitHub's max retry window

    try {
      // SET NX: returns true if new (not duplicate), false if already existed
      const isNew = await this.redisService.setNx(
        key,
        JSON.stringify({ markedAt: new Date().toISOString() }),
        ttlSeconds,
      );
      return !isNew; // true = is duplicate
    } catch (err) {
      // Redis down → fail safe: reject webhook (let GitHub retry)
      this.logger.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          severity: 'ERROR',
          message: 'redis_unavailable_for_idempotency_check',
          delivery_id: deliveryId,
          error: (err as Error).message,
        }),
      );
      throw new ServiceUnavailableException('Idempotency store unavailable');
    }
  }

  async queueWebhookEvent(data: QueueWebhookPayload): Promise<void> {
    const { deliveryId, eventType, action, payload, receivedAt, orgId } = data;

    // Persist delivery record BEFORE queuing (audit trail + status tracking)
    const delivery = this.deliveryRepo.create({
      delivery_id: deliveryId,
      event_type: eventType,
      action,
      status: 'queued',
      payload_json: payload,
      received_at: receivedAt,
      org_id: orgId,
    });
    await this.deliveryRepo.save(delivery);

    // Enqueue for async processing
    await this.webhookQueue.add(WEBHOOK_JOB, {
      deliveryId,
      eventType,
      action,
      payload,
      receivedAt: receivedAt.toISOString(),
      orgId,
    });

    // AUDIT-03: Log webhook receipt
    this.logger.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        severity: 'INFO',
        message: 'webhook_received',
        event_type: eventType,
        delivery_id: deliveryId,
        action,
      }),
    );
  }
}
