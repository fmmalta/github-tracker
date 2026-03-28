import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  otp_code!: string;

  @IsString()
  @MinLength(8)
  new_password!: string;
}
