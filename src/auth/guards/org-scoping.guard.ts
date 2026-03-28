import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserOrgAssignment } from '../entities/user-org-assignment.entity';
import { UserRepoAssignment } from '../entities/user-repo-assignment.entity';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

@Injectable()
export class OrgScopingGuard implements CanActivate {
  constructor(
    @InjectRepository(UserOrgAssignment)
    private readonly orgAssignmentRepo: Repository<UserOrgAssignment>,
    @InjectRepository(UserRepoAssignment)
    private readonly repoAssignmentRepo: Repository<UserRepoAssignment>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    // Admin bypasses all org/repo scoping
    if (user.role === 'admin') return true;

    const orgId = request.params['orgId'] ?? request.query['org_id'];
    const repoId = request.params['repoId'] ?? request.query['repo_id'];

    if (!orgId && !repoId) return true; // No org/repo context needed

    if (orgId) {
      const assignment = await this.orgAssignmentRepo.findOne({
        where: { user_id: user.id, org_id: orgId },
      });
      if (!assignment) {
        throw new ForbiddenException('Access denied to this organization');
      }
    }

    // Viewers must also have repo-level assignment
    if (repoId && user.role === 'viewer') {
      const assignment = await this.repoAssignmentRepo.findOne({
        where: { user_id: user.id, repo_id: repoId },
      });
      if (!assignment) {
        throw new ForbiddenException('Access denied to this repository');
      }
    }

    return true;
  }
}
