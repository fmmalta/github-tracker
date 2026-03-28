import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { Public } from './decorators/roles.decorator';

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create user account', description: 'First signup creates admin; subsequent signups create viewer role.' })
  @ApiResponse({ status: 201, description: 'User created, tokens returned', schema: { properties: { accessToken: { type: 'string' }, refreshToken: { type: 'string' } } } })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 400, description: 'Validation error (invalid email, password too short)' })
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto.email, dto.password);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user', description: 'Returns access and refresh tokens for authenticated user.' })
  @ApiResponse({ status: 200, description: 'Login successful', schema: { properties: { accessToken: { type: 'string' }, refreshToken: { type: 'string' } } } })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token', description: 'Returns new access token using valid refresh token.' })
  @ApiResponse({ status: 200, description: 'Token refreshed', schema: { properties: { accessToken: { type: 'string' } } } })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @Public()
  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request OTP for password reset', description: 'Sends one-time password to registered email address.' })
  @ApiResponse({ status: 200, description: 'OTP sent (or user not found — returns same message for security)' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async requestOtp(@Body() dto: RequestOtpDto) {
    await this.authService.requestOtp(dto.email);
    return { message: 'If that email is registered, an OTP has been sent' };
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and reset password', description: 'Validates OTP and updates user password.' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    await this.authService.verifyOtp(dto.email, dto.otp_code, dto.new_password);
    return { message: 'Password updated successfully' };
  }
}
