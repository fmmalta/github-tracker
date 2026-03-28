import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ example: 'user@example.com', description: 'Unique email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'securepassword123', minLength: 8, description: 'Password (min 8 chars)' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
