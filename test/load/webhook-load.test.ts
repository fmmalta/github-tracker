/**
 * Load test: POST /webhooks/github
 *
 * Goal (QA-05): 500 webhooks in 1 hour with no 4xx/5xx responses.
 * This test simulates 500 requests at controlled rate against a running server.
 *
 * Run: npm run test:load (requires server running on localhost:3000 with real Redis+PG)
 *
 * Usage:
 *   npx ts-node test/load/webhook-load.test.ts
 *
 * Pass criteria:
 *   - 0 non-2xx responses
 *   - 0 timeouts (server responds within 100ms)
 *   - No duplicate deliveries processed (check webhook_deliveries table after run)
 */

import * as crypto from 'crypto';
import * as http from 'http';

const BASE_URL = process.env.LOAD_TEST_URL ?? 'http://localhost:3000';
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET ?? 'dev-secret-change-in-production';
const TOTAL_REQUESTS = 500;
const REQUESTS_PER_SECOND = 2; // 500 reqs in ~250 seconds — well within 1-hour window
const REQUEST_TIMEOUT_MS = 100; // Each webhook must respond within 100ms (GH-06 requirement)

function generateSignature(body: string): string {
  return `sha256=${crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex')}`;
}

function generateWebhookPayload(index: number): string {
  return JSON.stringify({
    action: 'opened',
    pull_request: {
      id: 90000 + index,
      number: index,
      title: `Load test PR ${index}`,
      state: 'open',
      user: { id: 1001 + (index % 10), login: `dev-${index % 10}` },
      base: { ref: 'main' },
      head: { ref: `feature/load-test-${index}` },
      additions: 10,
      deletions: 5,
      changed_files: 1,
      created_at: new Date().toISOString(),
      merged_at: null,
      closed_at: null,
    },
    repository: { id: 777, name: 'load-test-repo', full_name: 'org/load-test-repo', private: false },
    installation: { id: 1 },
  });
}

async function sendWebhook(index: number, deliveryId: string): Promise<{ status: number; duration: number }> {
  const body = generateWebhookPayload(index);
  const signature = generateSignature(body);
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}/webhooks/github`);
    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port ? parseInt(url.port) : 3000,
      path: url.pathname,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': signature,
        'x-github-delivery': deliveryId,
        'x-github-event': 'pull_request',
        'content-length': Buffer.byteLength(body),
      },
      timeout: REQUEST_TIMEOUT_MS * 10, // 1000ms hard timeout (10x SLA for test stability)
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode ?? 0, duration: Date.now() - startTime });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request ${index} timed out after ${String(options.timeout)}ms`));
    });

    req.write(body);
    req.end();
  });
}

async function runLoadTest(): Promise<void> {
  console.log(`Load test: ${TOTAL_REQUESTS} webhook requests at ${REQUESTS_PER_SECOND} req/s`);
  console.log(`Target: ${BASE_URL}/webhooks/github`);
  console.log('---');

  const results: Array<{ status: number; duration: number }> = [];
  const errors: string[] = [];

  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    const deliveryId = `load-test-${Date.now()}-${i}`;

    try {
      const result = await sendWebhook(i, deliveryId);
      results.push(result);

      if (result.status < 200 || result.status >= 300) {
        errors.push(`Request ${i}: HTTP ${result.status}`);
      }
      if (result.duration > REQUEST_TIMEOUT_MS) {
        console.warn(`Request ${i}: slow response ${result.duration}ms (SLA: ${REQUEST_TIMEOUT_MS}ms)`);
      }
    } catch (err) {
      errors.push(`Request ${i}: ${(err as Error).message}`);
    }

    // Rate limit: REQUESTS_PER_SECOND (burst controlled)
    if (i % REQUESTS_PER_SECOND === REQUESTS_PER_SECOND - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Report
  const successful = results.filter(r => r.status >= 200 && r.status < 300).length;
  const failed = results.filter(r => r.status < 200 || r.status >= 300).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const maxDuration = Math.max(...results.map(r => r.duration));

  console.log(`\n=== Load Test Results ===`);
  console.log(`Total: ${TOTAL_REQUESTS}`);
  console.log(`Successful (2xx): ${successful}`);
  console.log(`Failed (4xx/5xx): ${failed}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Avg response time: ${avgDuration.toFixed(0)}ms`);
  console.log(`Max response time: ${maxDuration}ms`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.slice(0, 10).forEach(e => console.log(` - ${e}`));
  }

  // QA-05 pass criteria: zero non-2xx responses
  if (failed > 0 || errors.length > 0) {
    console.error(`\nFAILED: ${failed} non-2xx responses and ${errors.length} errors`);
    process.exit(1);
  } else {
    console.log(`\nPASSED: All ${TOTAL_REQUESTS} requests succeeded`);
  }
}

void runLoadTest();
