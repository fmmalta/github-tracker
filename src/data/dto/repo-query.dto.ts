import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RepoQueryDto {
  @ApiPropertyOptional({ example: 'api', description: 'Search by name or full_name' })
  @IsOptional()
  @IsString()
  search?: string;

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

  @ApiPropertyOptional({ example: 'name', enum: ['name', 'full_name', 'created_at', 'updated_at'], description: 'Sort field' })
  @IsOptional()
  @IsIn(['name', 'full_name', 'created_at', 'updated_at'])
  sort_by?: string = 'name';

  @ApiPropertyOptional({ example: 'ASC', enum: ['ASC', 'DESC'], description: 'Sort direction' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sort_dir?: 'ASC' | 'DESC' = 'ASC';
}
