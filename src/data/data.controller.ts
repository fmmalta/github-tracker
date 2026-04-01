import {
  Controller, Get, Post, Param, Query, UseGuards, NotFoundException, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { DataService } from './data.service';
import { RepoQueryDto } from './dto/repo-query.dto';
import { DeveloperQueryDto } from './dto/developer-query.dto';
import { PrQueryDto } from './dto/pr-query.dto';
import { AdminQueryDto } from './dto/admin-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { OrgScopingGuard } from '../auth/guards/org-scoping.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('Repositories', 'Developers', 'Pull Requests')
@ApiBearerAuth('access-token')
@Controller('api/v1')
@Roles('admin', 'manager', 'viewer')
@UseGuards(OrgScopingGuard)
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get('orgs')
  @ApiOperation({ summary: 'List active organizations visible to the current user' })
  @ApiResponse({ status: 200, description: 'List of organizations' })
  async getOrgs(@CurrentUser() user: AuthenticatedUser) {
    return this.dataService.getOrgs(user.id, user.role);
  }

  @Get('orgs/:orgId/repos')
  @ApiOperation({ summary: 'List repositories for organization' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiQuery({ name: 'search', type: String, required: false, description: 'Search by name or full_name' })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Page size (1-200, default 50)' })
  @ApiQuery({ name: 'offset', type: Number, required: false, description: 'Page offset (default 0)' })
  @ApiQuery({ name: 'sort_by', type: String, required: false, description: 'Sort field (name, full_name, created_at, updated_at)' })
  @ApiQuery({ name: 'sort_dir', type: String, required: false, description: 'Sort direction (ASC, DESC)' })
  @ApiResponse({ status: 200, description: 'List of repositories' })
  @ApiResponse({ status: 401, description: 'Unauthorized (missing/invalid JWT)' })
  @ApiResponse({ status: 403, description: 'Forbidden (insufficient role or org access)' })
  async getRepos(
    @Param('orgId') orgId: string,
    @Query() query: RepoQueryDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    return this.dataService.getRepos(orgId, query);
  }

  @Get('orgs/:orgId/repos/:repoId')
  @ApiOperation({ summary: 'Get single repository by ID' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'repoId', description: 'Repository ID' })
  @ApiResponse({ status: 200, description: 'Repository details' })
  @ApiResponse({ status: 401, description: 'Unauthorized (missing/invalid JWT)' })
  @ApiResponse({ status: 403, description: 'Forbidden (insufficient role or org access)' })
  @ApiResponse({ status: 404, description: 'Repository not found in organization' })
  async getRepo(
    @Param('orgId') orgId: string,
    @Param('repoId') repoId: string,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const repo = await this.dataService.getRepo(orgId, repoId);
    if (!repo) throw new NotFoundException(`Repository ${repoId} not found in org ${orgId}`);
    return repo;
  }

  @Get('orgs/:orgId/repos/:repoId/readme')
  @ApiOperation({ summary: 'Get repository README content (cached 1h)' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'repoId', description: 'Repository ID' })
  @ApiResponse({ status: 200, description: 'README markdown content' })
  @ApiResponse({ status: 404, description: 'Repository or README not found' })
  async getRepoReadme(
    @Param('orgId') orgId: string,
    @Param('repoId') repoId: string,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const result = await this.dataService.getReadme(orgId, repoId);
    if (!result) throw new NotFoundException(`README not found for repo ${repoId}`);
    return result;
  }

  @Get('orgs/:orgId/developers')
  @ApiOperation({ summary: 'List developers active in organization' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiQuery({ name: 'search', type: String, required: false, description: 'Search by login or name' })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Page size (1-200, default 50)' })
  @ApiQuery({ name: 'offset', type: Number, required: false, description: 'Page offset (default 0)' })
  @ApiQuery({ name: 'sort_by', type: String, required: false, description: 'Sort field (login, name, created_at)' })
  @ApiQuery({ name: 'sort_dir', type: String, required: false, description: 'Sort direction (ASC, DESC)' })
  @ApiResponse({ status: 200, description: 'List of developers' })
  @ApiResponse({ status: 401, description: 'Unauthorized (missing/invalid JWT)' })
  @ApiResponse({ status: 403, description: 'Forbidden (insufficient role or org access)' })
  async getDevelopers(
    @Param('orgId') orgId: string,
    @Query() query: DeveloperQueryDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    return this.dataService.getDevelopers(orgId, query);
  }

  @Get('orgs/:orgId/developers/:developerId')
  @ApiOperation({ summary: 'Get single developer by ID' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'developerId', description: 'Developer ID' })
  @ApiResponse({ status: 200, description: 'Developer details' })
  @ApiResponse({ status: 401, description: 'Unauthorized (missing/invalid JWT)' })
  @ApiResponse({ status: 403, description: 'Forbidden (insufficient role or org access)' })
  @ApiResponse({ status: 404, description: 'Developer not found in organization' })
  async getDeveloper(
    @Param('orgId') orgId: string,
    @Param('developerId') developerId: string,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const dev = await this.dataService.getDeveloper(orgId, developerId);
    if (!dev) throw new NotFoundException(`Developer ${developerId} not found in org ${orgId}`);
    return dev;
  }

  @Get('pull-requests')
  @ApiOperation({ summary: 'List pull requests with filtering', description: 'Returns paginated PRs. Use state, repo_id, developer_id, date range, and branch filters to narrow results.' })
  @ApiQuery({ name: 'org_id', type: String, required: false, description: 'Organization ID (required for scoping)' })
  @ApiQuery({ name: 'repo_id', type: String, required: false, description: 'Filter by repository ID' })
  @ApiQuery({ name: 'developer_id', type: String, required: false, description: 'Filter by developer ID' })
  @ApiQuery({ name: 'state', enum: ['open', 'closed', 'merged'], required: false, description: 'Filter by PR state' })
  @ApiQuery({ name: 'start_date', type: String, required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'end_date', type: String, required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'branch', type: String, required: false, description: 'Filter by base branch' })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Page size (1-200, default 50)' })
  @ApiQuery({ name: 'offset', type: Number, required: false, description: 'Page offset (default 0)' })
  @ApiQuery({ name: 'sort_by', type: String, required: false, description: 'Sort field (github_created_at, github_merged_at, additions, deletions, number)' })
  @ApiQuery({ name: 'sort_dir', type: String, required: false, description: 'Sort direction (ASC, DESC)' })
  @ApiResponse({ status: 200, description: 'List of pull requests' })
  @ApiResponse({ status: 401, description: 'Unauthorized (missing/invalid JWT)' })
  @ApiResponse({ status: 403, description: 'Forbidden (insufficient role or org access)' })
  async getPullRequests(
    @Query() query: PrQueryDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const orgId = query.org_id ?? '';
    return this.dataService.getPullRequests(orgId, query);
  }

  @Get('developer-reviews/:developerId')
  @ApiOperation({ summary: 'PRs reviewed by a specific developer' })
  @ApiParam({ name: 'developerId', description: 'Developer UUID' })
  @ApiQuery({ name: 'org_id', type: String, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'offset', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'Developer review history' })
  async getDeveloperReviews(
    @Param('developerId') developerId: string,
    @Query() query: { org_id?: string; limit?: number; offset?: number },
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const orgId = query.org_id ?? '';
    return this.dataService.getDeveloperReviews(developerId, orgId, query);
  }

  @Get('admin/sync-history')
  @Roles('admin')
  @ApiOperation({ summary: 'Paginated sync job history (newest first)' })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'offset', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'Sync history' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async getSyncHistory(@Query() query: AdminQueryDto) {
    return this.dataService.getSyncHistory(query);
  }

  @Get('admin/webhook-dlq')
  @Roles('admin')
  @ApiOperation({ summary: 'Failed webhook deliveries (dead-letter queue)' })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'offset', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'Failed webhook deliveries' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async getWebhookDlq(@Query() query: AdminQueryDto) {
    return this.dataService.getWebhookDlq(query);
  }

  @Post('admin/webhook-dlq/:id/retry')
  @Roles('admin')
  @HttpCode(201)
  @ApiOperation({ summary: 'Retry a failed webhook delivery' })
  @ApiParam({ name: 'id', description: 'WebhookDelivery UUID' })
  @ApiResponse({ status: 201, description: 'Retry queued' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  async retryWebhookDelivery(@Param('id') id: string) {
    return this.dataService.retryWebhookDelivery(id);
  }
}
