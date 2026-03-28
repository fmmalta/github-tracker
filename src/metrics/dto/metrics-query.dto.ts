import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MetricKey } from '../entities/daily-metric.entity';

const VALID_SORT_FIELDS = ['metric_value', 'metric_date', 'developer_id', 'repo_id'];
const VALID_SORT_DIRS = ['ASC', 'DESC'];

export class MetricsQueryDto {
  @IsDateString()
  start_date!: string;  // 'YYYY-MM-DD' — required

  @IsDateString()
  end_date!: string;    // 'YYYY-MM-DD' — required

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

  @ApiPropertyOptional({ example: 'main', description: 'Filter by branch name' })
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiPropertyOptional({ example: 'prs_opened', description: 'Filter to single metric key' })
  @IsOptional()
  @IsString()
  metric_key?: MetricKey;

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

  @ApiPropertyOptional({ example: 'metric_date', description: 'Sort by field' })
  @IsOptional()
  @IsIn(VALID_SORT_FIELDS)
  sort_by?: string = 'metric_date';

  @ApiPropertyOptional({ example: 'DESC', description: 'Sort direction' })
  @IsOptional()
  @IsIn(VALID_SORT_DIRS)
  sort_dir?: 'ASC' | 'DESC' = 'DESC';
}
