import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepository } from 'typeorm';
import { UserOrgAssignment } from '../entities/user-org-assignment.entity';
import { UserRepoAssignment } from '../entities/user-repo-assignment.entity';
import { AuthenticatedUser } from '../strategies/jwt.strategy';
import { Repository } from '../../github/entities/repository.entity';

@Injectable()
export class OrgScopingGuard implements CanActivate {
  constructor(
    @InjectRepository(UserOrgAssignment)
    private readonly orgAssignmentRepo: TypeOrmRepository<UserOrgAssignment>,
    @InjectRepository(UserRepoAssignment)
    private readonly repoAssignmentRepo: TypeOrmRepository<UserRepoAssignment>,
    @InjectRepository(Repository)
    private readonly repositoryRepo: TypeOrmRepository<Repository>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    // Admin bypasses all org/repo scoping
    if (user.role === 'admin') return true;

    const orgIdRaw = request.params['orgId'] ?? request.query['org_id'];
    const repoIdRaw = request.params['repoId'] ?? request.query['repo_id'];
    const orgId = typeof orgIdRaw === 'string' && orgIdRaw.trim().length > 0 ? orgIdRaw : undefined;
    const repoId = typeof repoIdRaw === 'string' && repoIdRaw.trim().length > 0 ? repoIdRaw : undefined;

    if (!orgId && !repoId) return true; // No org/repo context needed

    let resolvedOrgId = orgId;

    if (repoId) {
      const repo = await this.repositoryRepo.findOne({
        where: { id: repoId },
        select: ['id', 'org_id'],
      });

      if (!repo) {
        throw new ForbiddenException('Access denied to this repository');
      }

      if (resolvedOrgId && repo.org_id !== resolvedOrgId) {
        throw new ForbiddenException('Repository does not belong to provided organization');
      }

      resolvedOrgId = repo.org_id;
    }

    if (resolvedOrgId) {
      const orgAssignment = await this.orgAssignmentRepo.findOne({
        where: { user_id: user.id, org_id: resolvedOrgId },
      });
      if (!orgAssignment) {
        throw new ForbiddenException('Access denied to this organization');
      }
    }

    // Viewers must have repo-level assignment for repo-scoped routes
    if (repoId && user.role === 'viewer') {
      const assignment = await this.repoAssignmentRepo.findOne({
        where: { user_id: user.id, repo_id: repoId, org_id: resolvedOrgId },
      });
      if (!assignment) {
        throw new ForbiddenException('Access denied to this repository');
      }
    }

    return true;
  }
}
