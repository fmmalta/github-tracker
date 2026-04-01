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
    // TODO: restore org/repo scoping after admin management UI is built
    return true;
  }
}
