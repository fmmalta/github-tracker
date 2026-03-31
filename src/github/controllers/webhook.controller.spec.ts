import { ConfigService } from '@nestjs/config';
import { WebhookController } from './webhook.controller';
import { WebhookService } from '../services/webhook.service';

describe('WebhookController', () => {
  it('returns 500 when webhook secret is not configured', async () => {
    const webhookService = {
      verifySignature: jest.fn(),
      checkAndMarkDelivery: jest.fn(),
      queueWebhookEvent: jest.fn(),
    } as unknown as WebhookService;

    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;

    const controller = new WebhookController(webhookService, configService);

    const req = {
      headers: {
        'x-hub-signature-256': 'sha256=abc',
        'x-github-delivery': 'delivery-1',
        'x-github-event': 'pull_request',
      },
      body: { action: 'opened' },
    } as any;

    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const res = { status, json } as any;

    await controller.handleGitHubWebhook(req, res);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: 'Webhook secret is not configured' });
    expect((webhookService as any).verifySignature).not.toHaveBeenCalled();
  });
});
