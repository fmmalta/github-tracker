import {
  Controller, Post, Req, Res, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WebhookService } from '../services/webhook.service';
import { ConfigService } from '@nestjs/config';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly configService: ConfigService,
  ) {}

  @Post('github')
  async handleGitHubWebhook(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const deliveryId = req.headers['x-github-delivery'] as string | undefined;
    const eventType = req.headers['x-github-event'] as string | undefined;

    // 1. Verify HMAC-SHA256 signature — reject spoofed payloads
    const secret = this.configService.get<string>('GITHUB_WEBHOOK_SECRET', '');
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body));

    if (!signature || !this.webhookService.verifySignature(rawBody, signature, secret)) {
      this.logger.warn(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          severity: 'WARN',
          message: 'webhook_signature_invalid',
          delivery_id: deliveryId,
        }),
      );
      res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Invalid signature' });
      return;
    }

    if (!deliveryId || !eventType) {
      res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing required headers' });
      return;
    }

    // 2. Deduplicate via X-GitHub-Delivery (Redis SET NX, 24-hour TTL)
    const isDuplicate = await this.webhookService.checkAndMarkDelivery(deliveryId);

    if (isDuplicate) {
      this.logger.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          severity: 'INFO',
          message: 'webhook_duplicate_skipped',
          delivery_id: deliveryId,
          event_type: eventType,
        }),
      );
      res.status(HttpStatus.OK).json({ status: 'acknowledged', isDuplicate: true });
      return;
    }

    // 3. Queue asynchronously — return 200 immediately (< 100ms SLA)
    const action = (req.body as { action?: string }).action ?? null;
    await this.webhookService.queueWebhookEvent({
      deliveryId,
      eventType,
      action,
      payload: req.body as Record<string, unknown>,
      receivedAt: new Date(),
      orgId: null, // Populated in processor after org lookup
    });

    res.status(HttpStatus.OK).json({ status: 'queued', deliveryId });
  }
}
