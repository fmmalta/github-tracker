import {
  Controller, Get, Param, Query, UseGuards, NotFoundException,
} from '@nestjs/common';
import { DataService } from './data.service';
import { RepoQueryDto } from './dto/repo-query.dto';
import { DeveloperQueryDto } from './dto/developer-query.dto';
import { PrQueryDto } from './dto/pr-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { OrgScopingGuard } from '../auth/guards/org-scoping.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('api/v1')
@Roles('admin', 'manager', 'viewer')
@UseGuards(OrgScopingGuard)
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get('orgs/:orgId/repos')
  async getRepos(
    @Param('orgId') orgId: string,
    @Query() query: RepoQueryDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    return this.dataService.getRepos(orgId, query);
  }

  @Get('orgs/:orgId/repos/:repoId')
  async getRepo(
    @Param('orgId') orgId: string,
    @Param('repoId') repoId: string,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const repo = await this.dataService.getRepo(orgId, repoId);
    if (!repo) throw new NotFoundException(`Repository ${repoId} not found in org ${orgId}`);
    return repo;
  }

  @Get('orgs/:orgId/developers')
  async getDevelopers(
    @Param('orgId') orgId: string,
    @Query() query: DeveloperQueryDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    return this.dataService.getDevelopers(orgId, query);
  }

  @Get('orgs/:orgId/developers/:developerId')
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
  async getPullRequests(
    @Query() query: PrQueryDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const orgId = query.org_id ?? '';
    return this.dataService.getPullRequests(orgId, query);
  }
}
