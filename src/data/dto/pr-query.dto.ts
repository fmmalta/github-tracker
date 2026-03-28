import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

const PR_SORT_FIELDS = ['github_created_at', 'github_merged_at', 'additions', 'deletions', 'number'];
const PR_STATES = ['open', 'closed', 'merged'];

export class PrQueryDto {
  @IsOptional()
  @IsString()
  org_id?: string;

  @IsOptional()
  @IsString()
  repo_id?: string;  // Filter by repository

  @IsOptional()
  @IsString()
  developer_id?: string;  // Filter by author_id

  @IsOptional()
  @IsIn(PR_STATES)
  state?: 'open' | 'closed' | 'merged';

  @IsOptional()
  @IsDateString()
  start_date?: string;  // Filter github_created_at >= start_date

  @IsOptional()
  @IsDateString()
  end_date?: string;    // Filter github_created_at <= end_date

  @IsOptional()
  @IsString()
  branch?: string;  // Filter base_branch

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsIn(PR_SORT_FIELDS)
  sort_by?: string = 'github_created_at';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sort_dir?: 'ASC' | 'DESC' = 'DESC';
}
