import { IsEmail, IsString, Length, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: 'user@example.com', description: 'Registered email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456', description: 'OTP code (6 digits)' })
  @IsString()
  @Length(6, 6)
  otp_code!: string;

  @ApiProperty({ example: 'newSecurePassword123', minLength: 8, description: 'New password (min 8 chars)' })
  @IsString()
  @MinLength(8)
  new_password!: string;
}
