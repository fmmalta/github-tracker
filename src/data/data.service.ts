import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepository } from 'typeorm';
import { Repository } from '../github/entities/repository.entity';
import { Developer } from '../github/entities/developer.entity';
import { PullRequest } from '../github/entities/pull-request.entity';
import { RepoQueryDto } from './dto/repo-query.dto';
import { DeveloperQueryDto } from './dto/developer-query.dto';
import { PrQueryDto } from './dto/pr-query.dto';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class DataService {
  private readonly logger = new Logger(DataService.name);

  constructor(
    @InjectRepository(Repository)
    private readonly repoRepo: TypeOrmRepository<Repository>,
    @InjectRepository(Developer)
    private readonly developerRepo: TypeOrmRepository<Developer>,
    @InjectRepository(PullRequest)
    private readonly prRepo: TypeOrmRepository<PullRequest>,
  ) {}

  async getRepos(orgId: string, query: RepoQueryDto): Promise<PaginatedResponse<Repository>> {
    const qb = this.repoRepo.createQueryBuilder('repo')
      .where('repo.org_id = :orgId', { orgId });

    if (query.search) {
      qb.andWhere('(repo.name ILIKE :search OR repo.full_name ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const total = await qb.getCount();
    const sortCol = `repo.${query.sort_by ?? 'name'}`;
    const data = await qb
      .orderBy(sortCol, query.sort_dir ?? 'ASC')
      .skip(query.offset ?? 0)
      .take(query.limit ?? 50)
      .getMany();

    return { data, total, limit: query.limit ?? 50, offset: query.offset ?? 0 };
  }

  async getRepo(orgId: string, repoId: string): Promise<Repository | null> {
    return this.repoRepo.findOne({ where: { id: repoId, org_id: orgId } });
  }

  async getDevelopers(orgId: string, query: DeveloperQueryDto): Promise<PaginatedResponse<Developer>> {
    // Developers are org-scoped via their PR activity — we look up developers who have PRs in this org
    const qb = this.developerRepo.createQueryBuilder('dev')
      .innerJoin('pull_requests', 'pr', 'pr.author_id = dev.id AND pr.org_id = :orgId', { orgId })
      .distinct(true);

    if (query.search) {
      qb.andWhere('(dev.login ILIKE :search OR dev.name ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const total = await qb.getCount();
    const sortCol = `dev.${query.sort_by ?? 'login'}`;
    const data = await qb
      .orderBy(sortCol, query.sort_dir ?? 'ASC')
      .skip(query.offset ?? 0)
      .take(query.limit ?? 50)
      .getMany();

    return { data, total, limit: query.limit ?? 50, offset: query.offset ?? 0 };
  }

  async getDeveloper(orgId: string, developerId: string): Promise<Developer | null> {
    // Verify developer has activity in this org before returning
    const result = await this.developerRepo.createQueryBuilder('dev')
      .innerJoin('pull_requests', 'pr', 'pr.author_id = dev.id AND pr.org_id = :orgId', { orgId })
      .where('dev.id = :developerId', { developerId })
      .getOne();
    return result;
  }

  async getPullRequests(orgId: string, query: PrQueryDto): Promise<PaginatedResponse<PullRequest>> {
    const qb = this.prRepo.createQueryBuilder('pr')
      .where('pr.org_id = :orgId', { orgId });

    if (query.repo_id) {
      qb.andWhere('pr.repository_id = :repoId', { repoId: query.repo_id });
    }
    if (query.developer_id) {
      qb.andWhere('pr.author_id = :developerId', { developerId: query.developer_id });
    }
    if (query.state) {
      qb.andWhere('pr.state = :state', { state: query.state });
    }
    if (query.branch) {
      qb.andWhere('pr.base_branch = :branch', { branch: query.branch });
    }
    if (query.start_date) {
      qb.andWhere('pr.github_created_at >= :startDate', { startDate: new Date(query.start_date) });
    }
    if (query.end_date) {
      qb.andWhere('pr.github_created_at <= :endDate', { endDate: new Date(query.end_date + 'T23:59:59Z') });
    }

    const total = await qb.getCount();
    const sortCol = `pr.${query.sort_by ?? 'github_created_at'}`;
    const data = await qb
      .orderBy(sortCol, query.sort_dir ?? 'DESC')
      .skip(query.offset ?? 0)
      .take(query.limit ?? 50)
      .getMany();

    return { data, total, limit: query.limit ?? 50, offset: query.offset ?? 0 };
  }
}
