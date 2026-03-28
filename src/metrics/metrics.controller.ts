import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsQueryDto } from './dto/metrics-query.dto';
import { Roles, Public } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrgScopingGuard } from '../auth/guards/org-scoping.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('api/v1')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('metrics/org/:orgId')
  @Roles('admin', 'manager', 'viewer')
  @UseGuards(OrgScopingGuard)
  async getOrgMetrics(
    @Param('orgId') orgId: string,
    @Query() query: MetricsQueryDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    return this.metricsService.getOrgMetrics(orgId, query);
  }

  @Get('metrics/repo/:repoId')
  @Roles('admin', 'manager', 'viewer')
  @UseGuards(OrgScopingGuard)
  async getRepoMetrics(
    @Param('repoId') repoId: string,
    @Query() query: MetricsQueryDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const orgId = query.org_id ?? '';
    return this.metricsService.getRepoMetrics(repoId, orgId, query);
  }

  @Get('metrics/developer/:developerId')
  @Roles('admin', 'manager', 'viewer')
  @UseGuards(OrgScopingGuard)
  async getDeveloperMetrics(
    @Param('developerId') developerId: string,
    @Query() query: MetricsQueryDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const orgId = query.org_id ?? '';
    return this.metricsService.getDeveloperMetrics(developerId, orgId, query);
  }

  @Get('metrics/leaderboard')
  @Roles('admin', 'manager', 'viewer')
  @UseGuards(OrgScopingGuard)
  async getLeaderboard(
    @Query() query: MetricsQueryDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const orgId = query.org_id ?? '';
    return this.metricsService.getLeaderboard(orgId, query);
  }

  @Get('metrics/trends')
  @Roles('admin', 'manager', 'viewer')
  @UseGuards(OrgScopingGuard)
  async getTrends(
    @Query() query: MetricsQueryDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const orgId = query.org_id ?? '';
    return this.metricsService.getTrends(orgId, query);
  }

  @Public()
  @Get('health')
  async getHealth() {
    return this.metricsService.getHealth();
  }
}
