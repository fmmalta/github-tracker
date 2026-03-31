import { Controller, Post, Body, HttpCode, HttpStatus, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
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

  private extractCookie(req: Request, name: string): string | null {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;
    const parts = cookieHeader.split(';').map((c) => c.trim());
    const target = parts.find((p) => p.startsWith(`${name}=`));
    if (!target) return null;
    return decodeURIComponent(target.slice(name.length + 1));
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? 'unknown';
  }

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create user account', description: 'First signup creates admin; subsequent signups create viewer role.' })
  @ApiResponse({ status: 201, description: 'User created, access token returned and refresh token set in HttpOnly cookie', schema: { properties: { accessToken: { type: 'string' } } } })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 400, description: 'Validation error (invalid email, password too short)' })
  async signup(
    @Body() dto: SignupDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = this.getClientIp(req);
    const { accessToken, refreshToken } = await this.authService.signup(dto.email, dto.password, ip);
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/api/v1/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.cookie('auth_present', 'true', {
      httpOnly: false,
      secure: isProd,
      sameSite: 'strict',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { accessToken };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user', description: 'Returns access token and sets refresh token cookie.' })
  @ApiResponse({ status: 200, description: 'Login successful', schema: { properties: { accessToken: { type: 'string' } } } })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = this.getClientIp(req);
    const { accessToken, refreshToken } = await this.authService.login(dto.email, dto.password, ip);
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/api/v1/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.cookie('auth_present', 'true', {
      httpOnly: false,
      secure: isProd,
      sameSite: 'strict',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { accessToken };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token', description: 'Returns new access token using refresh token cookie (or request body fallback).' })
  @ApiResponse({ status: 200, description: 'Token refreshed', schema: { properties: { accessToken: { type: 'string' } } } })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
  ) {
    const refreshToken = dto.refresh_token ?? this.extractCookie(req, 'refresh_token');
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    return this.authService.refresh(refreshToken, this.getClientIp(req));
  }

  @Public()
  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request OTP for password reset', description: 'Sends one-time password to registered email address.' })
  @ApiResponse({ status: 200, description: 'OTP sent (or user not found — returns same message for security)' })
  @ApiResponse({ status: 429, description: 'Too many OTP requests' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async requestOtp(@Body() dto: RequestOtpDto, @Req() req: Request) {
    await this.authService.requestOtp(dto.email, this.getClientIp(req));
    return { message: 'If that email is registered, an OTP has been sent' };
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and reset password', description: 'Validates OTP and updates user password.' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 429, description: 'Too many invalid OTP attempts' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request) {
    await this.authService.verifyOtp(dto.email, dto.otp_code, dto.new_password, this.getClientIp(req));
    return { message: 'Password updated successfully' };
  }
}
