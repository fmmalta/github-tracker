import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { MetricKey } from '../entities/daily-metric.entity';

const VALID_SORT_FIELDS = ['metric_value', 'metric_date', 'developer_id', 'repo_id'];
const VALID_SORT_DIRS = ['ASC', 'DESC'];

export class MetricsQueryDto {
  @IsDateString()
  start_date!: string;  // 'YYYY-MM-DD' — required

  @IsDateString()
  end_date!: string;    // 'YYYY-MM-DD' — required

  @IsOptional()
  @IsString()
  org_id?: string;

  @IsOptional()
  @IsString()
  repo_id?: string;

  @IsOptional()
  @IsString()
  developer_id?: string;

  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsString()
  metric_key?: MetricKey;  // Filter to single metric

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
  @IsIn(VALID_SORT_FIELDS)
  sort_by?: string = 'metric_date';

  @IsOptional()
  @IsIn(VALID_SORT_DIRS)
  sort_dir?: 'ASC' | 'DESC' = 'DESC';
}
