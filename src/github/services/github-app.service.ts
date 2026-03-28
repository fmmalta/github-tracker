import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App } from '@octokit/app';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class GitHubAppService {
  private readonly logger = new Logger(GitHubAppService.name);
  private app: App;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.app = new App({
      appId: this.configService.get<string>('GITHUB_APP_ID', ''),
      privateKey: this.configService.get<string>('GITHUB_PRIVATE_KEY', ''),
    });
  }

  async getInstallationToken(installationId: number): Promise<string> {
    const cacheKey = `github-token:${installationId}`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as { token: string };
      return parsed.token;
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
