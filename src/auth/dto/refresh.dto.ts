import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty({ example: 'opaque-refresh-token', description: 'Optional refresh token from request body (cookie preferred)', required: false })
  @IsOptional()
  @IsString()
  refresh_token?: string;
}
