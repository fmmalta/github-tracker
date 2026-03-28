import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const PR_SORT_FIELDS = ['github_created_at', 'github_merged_at', 'additions', 'deletions', 'number'];
const PR_STATES = ['open', 'closed', 'merged'];

export class PrQueryDto {
  @ApiPropertyOptional({ example: 'org-123', description: 'Organization ID (required for scoping)' })
  @IsOptional()
  @IsString()
  org_id?: string;

  @ApiPropertyOptional({ example: 'repo-456', description: 'Filter by repository ID' })
  @IsOptional()
  @IsString()
  repo_id?: string;

  @ApiPropertyOptional({ example: 'dev-789', description: 'Filter by developer ID' })
  @IsOptional()
  @IsString()
  developer_id?: string;

  @ApiPropertyOptional({ example: 'open', enum: PR_STATES, description: 'Filter by PR state' })
  @IsOptional()
  @IsIn(PR_STATES)
  state?: 'open' | 'closed' | 'merged';

  @ApiPropertyOptional({ example: '2024-01-01', description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ example: '2024-03-31', description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ example: 'main', description: 'Filter by base branch' })
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiPropertyOptional({ example: 50, description: 'Page size (1-200, default 50)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiPropertyOptional({ example: 0, description: 'Page offset (default 0)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({ example: 'github_created_at', enum: PR_SORT_FIELDS, description: 'Sort field' })
  @IsOptional()
  @IsIn(PR_SORT_FIELDS)
  sort_by?: string = 'github_created_at';

  @ApiPropertyOptional({ example: 'DESC', enum: ['ASC', 'DESC'], description: 'Sort direction' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sort_dir?: 'ASC' | 'DESC' = 'DESC';
}
