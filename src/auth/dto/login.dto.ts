import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: 'Registered email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'securepassword123', description: 'Account password' })
  @IsString()
  password!: string;
}
