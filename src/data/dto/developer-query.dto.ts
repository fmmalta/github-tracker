import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DeveloperQueryDto {
  @ApiPropertyOptional({ example: 'john', description: 'Search by login or name' })
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

  @ApiPropertyOptional({ example: 'login', enum: ['login', 'name', 'created_at'], description: 'Sort field' })
  @IsOptional()
  @IsIn(['login', 'name', 'created_at'])
  sort_by?: string = 'login';

  @ApiPropertyOptional({ example: 'ASC', enum: ['ASC', 'DESC'], description: 'Sort direction' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sort_dir?: 'ASC' | 'DESC' = 'ASC';
}
