import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App } from '@octokit/app';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class GitHubAppService {
  private readonly logger = new Logger(GitHubAppService.name);
  private app: App | null = null;
  private usePatAuth: boolean;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    const appId = this.configService.get<string>('GITHUB_APP_ID', '').trim();
    const privateKey = this.configService.get<string>('GITHUB_PRIVATE_KEY', '').trim();
    const pat = this.configService.get<string>('GITHUB_PAT', '').trim();

    // Use PAT if available, otherwise fall back to GitHub App
    this.usePatAuth = !!pat && pat !== 'placeholder';

    if (!this.usePatAuth && appId && appId !== 'placeholder' && privateKey && privateKey !== 'placeholder') {
      this.app = new App({
        appId,
        privateKey,
      });
    }
  }

  async getInstallationToken(installationId: number): Promise<string> {
    if (this.usePatAuth) {
      const pat = this.configService.get<string>('GITHUB_PAT', '');
      return pat;
    }

    const cacheKey = `github-token:${installationId}`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as { token: string };
      return parsed.token;
    }

    if (!this.app) {
      throw new Error('GitHub App not configured and no PAT provided');
    }

    const token = await this.fetchInstallationToken(installationId);

    await this.redisService.set(
      cacheKey,
      JSON.stringify({ token }),
      59 * 60, // 59 minutes — 1-minute safety buffer before GitHub's 1-hour expiry
    );

    return token;
  }

  private async fetchInstallationToken(installationId: number): Promise<string> {
    if (!this.app) {
      throw new Error('GitHub App not configured');
    }
    const octokit = await this.app.getInstallationOctokit(installationId);
    const auth = (await octokit.auth({ type: 'installation' })) as { token: string };
    return auth.token;
  }

  async getOctokitForInstallation(installationId: number) {
    const token = await this.getInstallationToken(installationId);
    const { Octokit } = await import('@octokit/rest');
    return new Octokit({ auth: token });
  }
}
