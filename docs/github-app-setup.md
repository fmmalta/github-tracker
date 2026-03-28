# GitHub App Setup Guide

This document explains how to create a GitHub App and connect it to the GitHub Engineering Analytics Platform.

## Prerequisites

- Admin access to your GitHub organization
- Docker and Node.js 22 installed locally
- Access to the application's admin interface (POST /github/connect)

## Step 1: Create a GitHub App

1. Go to **GitHub.com -> Settings -> Developer settings -> GitHub Apps -> New GitHub App**
   (or `https://github.com/organizations/{your-org}/settings/apps/new` for org-level apps)

2. Fill in the required fields:
   - **GitHub App name**: e.g. `My Org Engineering Analytics`
   - **Homepage URL**: Your application URL (e.g. `https://analytics.yourcompany.com`)
   - **Webhook URL**: `https://analytics.yourcompany.com/webhooks/github`
   - **Webhook secret**: Generate a strong random secret (min 32 chars):
     ```bash
     openssl rand -hex 32
     ```
     Save this value — you will need it as `GITHUB_WEBHOOK_SECRET`.

3. **Permissions** — Set these repository permissions:
   - Pull requests: **Read-only**
   - Contents: **Read-only** (for commit data)
   - Metadata: **Read-only** (always required)

4. **Subscribe to events**:
   - Check: `Pull request`
   - Check: `Pull request review`

5. Click **Create GitHub App**.

## Step 2: Generate a Private Key

1. On the GitHub App settings page, scroll to **Private keys**.
2. Click **Generate a private key** — this downloads a `.pem` file.
3. Store the `.pem` file securely. Set the contents as the `GITHUB_PRIVATE_KEY` environment variable:
   ```bash
   # Convert .pem file to single-line env var (replace newlines with \n)
   GITHUB_PRIVATE_KEY=$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' path/to/your-app.pem)
   echo "GITHUB_PRIVATE_KEY=$GITHUB_PRIVATE_KEY" >> .env
   ```

4. Note the **App ID** displayed on the settings page — set it as `GITHUB_APP_ID`.

## Step 3: Install the GitHub App on Your Organization

1. On the GitHub App settings page, click **Install App**.
2. Choose your organization, then click **Install**.
3. GitHub will redirect you to the installation confirmation page.
4. The URL will contain the **Installation ID**:
   `https://github.com/organizations/{org}/settings/installations/{installation-id}`

   Note this ID — set it as `GITHUB_INSTALLATION_ID`.

## Step 4: Configure Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

Required values:
```
GITHUB_APP_ID=<your-app-id>
GITHUB_PRIVATE_KEY=<contents-of-pem-file-with-\n-escaped-newlines>
GITHUB_WEBHOOK_SECRET=<webhook-secret-from-step-1>
GITHUB_INSTALLATION_ID=<installation-id-from-step-3>
```

## Step 5: Start the Application

```bash
docker-compose up -d    # Start PostgreSQL + Redis
npm run migration:run   # Apply database schema
npm run start:dev       # Start NestJS application
```

Verify the application is running:
```bash
curl http://localhost:3000/health
```

## Step 6: Connect Your Organization

Send a POST request to trigger the initial 90-day backfill:

```bash
curl -X POST http://localhost:3000/github/connect \
  -H "Content-Type: application/json" \
  -d '{
    "installationId": <GITHUB_INSTALLATION_ID>,
    "orgLogin": "<your-org-login>",
    "githubOrgId": <your-org-github-id>
  }'
```

The response will include a `syncJobId` — use this to track backfill progress.

## Troubleshooting

**Webhook signature failures (401)**
- Verify `GITHUB_WEBHOOK_SECRET` matches the secret set in GitHub App settings.
- Ensure the webhook URL is publicly accessible (GitHub cannot reach `localhost`).

**Rate limit errors (403/429)**
- The system automatically retries with exponential backoff (1s -> 60s max).
- If backfill fails repeatedly, check the `sync_jobs` table for error messages.

**Token refresh issues**
- GitHub App installation tokens expire after 1 hour. The system caches with a 59-minute TTL.
- If you see authentication errors, verify `GITHUB_PRIVATE_KEY` is correctly formatted.

**Missing PRs after backfill**
- The system validates completeness against GitHub stats.
- Check `sync_jobs.error_message` for any gap detection messages.
