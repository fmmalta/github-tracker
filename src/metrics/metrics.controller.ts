import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { AggregationService } from './aggregation.service';
import { MetricsQueryDto } from './dto/metrics-query.dto';
import { Roles, Public } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrgScopingGuard } from '../auth/guards/org-scoping.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('Metrics')
@ApiBearerAuth('access-token')
@Controller('api/v1')
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly aggregationService: AggregationService,
  ) {}

  @Get('metrics/org/:orgId')
  @Roles('admin', 'manager', 'viewer')
  @UseGuards(OrgScopingGuard)
  @ApiOperation({ summary: 'Organization-level metrics aggregated across date range' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiQuery({ name: 'start_date', type: String, required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'end_date', type: String, required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'metric_key', type: String, required: false, description: 'Filter to single metric key' })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Page size (default 50)' })
  @ApiQuery({ name: 'offset', type: Number, required: false, description: 'Page offset (default 0)' })
  @ApiResponse({ status: 200, description: 'Organization metrics' })
  @ApiResponse({ status: 401, description: 'Unauthorized (missing/invalid JWT)' })
  @ApiResponse({ status: 403, description: 'Forbidden (insufficient role or org access)' })
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
  @ApiOperation({ summary: 'Repository-level metrics aggregated across date range' })
  @ApiParam({ name: 'repoId', description: 'Repository ID' })
  @ApiQuery({ name: 'start_date', type: String, required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'end_date', type: String, required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'org_id', type: String, required: false, description: 'Organization ID (for scoping)' })
  @ApiResponse({ status: 200, description: 'Repository metrics' })
  @ApiResponse({ status: 401, description: 'Unauthorized (missing/invalid JWT)' })
  @ApiResponse({ status: 403, description: 'Forbidden (insufficient role or org access)' })
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
  @ApiOperation({ summary: 'Developer-level metrics aggregated across date range' })
  @ApiParam({ name: 'developerId', description: 'Developer ID' })
  @ApiQuery({ name: 'start_date', type: String, required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'end_date', type: String, required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'org_id', type: String, required: false, description: 'Organization ID (for scoping)' })
  @ApiResponse({ status: 200, description: 'Developer metrics' })
  @ApiResponse({ status: 401, description: 'Unauthorized (missing/invalid JWT)' })
  @ApiResponse({ status: 403, description: 'Forbidden (insufficient role or org access)' })
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
  @ApiOperation({ summary: 'Developer leaderboard ranked by metric', description: 'Returns developers ranked by selected metric. Not a productivity ranking — reflects GitHub activity patterns only.' })
  @ApiQuery({ name: 'start_date', type: String, required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'end_date', type: String, required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'org_id', type: String, required: false, description: 'Organization ID (for scoping)' })
  @ApiQuery({ name: 'metric_key', type: String, required: false, description: 'Metric to rank by (default prs_opened)' })
  @ApiResponse({ status: 200, description: 'Developer leaderboard' })
  @ApiResponse({ status: 401, description: 'Unauthorized (missing/invalid JWT)' })
  @ApiResponse({ status: 403, description: 'Forbidden (insufficient role or org access)' })
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
  @ApiOperation({ summary: 'Metrics trends over time (daily aggregates)' })
  @ApiQuery({ name: 'start_date', type: String, required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'end_date', type: String, required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'org_id', type: String, required: false, description: 'Organization ID (for scoping)' })
  @ApiQuery({ name: 'repo_id', type: String, required: false, description: 'Filter by repository ID' })
  @ApiQuery({ name: 'developer_id', type: String, required: false, description: 'Filter by developer ID' })
  @ApiResponse({ status: 200, description: 'Metrics trends' })
  @ApiResponse({ status: 401, description: 'Unauthorized (missing/invalid JWT)' })
  @ApiResponse({ status: 403, description: 'Forbidden (insufficient role or org access)' })
  async getTrends(
    @Query() query: MetricsQueryDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const orgId = query.org_id ?? '';
    return this.metricsService.getTrends(orgId, query);
  }

  @Post('admin/aggregate')
  @Roles('admin')
  @ApiOperation({ summary: 'Backfill daily metrics aggregation for the past 90 days' })
  @ApiResponse({ status: 201, description: 'Aggregation complete' })
  async triggerAggregation() {
    const today = new Date();
    const days = 90;
    for (let i = 1; i <= days; i++) {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() - i);
      await this.aggregationService.computeDailyMetrics(date);
    }
    return { status: 'ok', days_aggregated: days };
  }

  @Public()
  @Get('health')
  @ApiTags('Health')
  @ApiOperation({ summary: 'Public liveness check (minimal)' })
  @ApiResponse({ status: 200, description: 'System is alive' })
  async getHealth() {
    return { status: 'ok' };
  }

  @Get('admin/health')
  @Roles('admin')
  @ApiTags('Health')
  @ApiOperation({ summary: 'Admin diagnostics (queue, sync, metrics internals)' })
  @ApiResponse({ status: 200, description: 'Detailed health status' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async getAdminHealth() {
    return this.metricsService.getHealth();
  }
}
