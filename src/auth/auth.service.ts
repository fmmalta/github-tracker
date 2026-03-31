import {
  Injectable, ConflictException, UnauthorizedException,
  BadRequestException, Logger, HttpException, HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserRepository } from './repositories/user.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { UserRole } from './entities/user.entity';
import { PasswordResetOtp } from './entities/password-reset-otp.entity';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SESSION_TTL = 2592000; // 30 days in seconds
  private readonly LOGIN_WINDOW_SECONDS = 15 * 60;
  private readonly LOGIN_MAX_ATTEMPTS = 10;
  private readonly OTP_REQUEST_WINDOW_SECONDS = 15 * 60;
  private readonly OTP_REQUEST_MAX_ATTEMPTS_PER_EMAIL = 5;
  private readonly OTP_REQUEST_MAX_ATTEMPTS_PER_IP = 20;
  private readonly OTP_VERIFY_WINDOW_SECONDS = 15 * 60;
  private readonly OTP_VERIFY_MAX_FAILED_ATTEMPTS = 5;
  private readonly OTP_LOCK_SECONDS = 15 * 60;
  private readonly REFRESH_WINDOW_SECONDS = 5 * 60;
  private readonly REFRESH_MAX_ATTEMPTS_PER_IP = 60;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    @InjectRepository(PasswordResetOtp)
    private readonly otpRepository: Repository<PasswordResetOtp>,
  ) {}

  private issueTokens(userId: string, email: string, role: string) {
    const secret = this.configService.getOrThrow<string>('JWT_SECRET');
    const accessToken = this.jwtService.sign(
      { sub: userId, email, role },
      { secret, expiresIn: '15m' },
    );
    const refreshToken = crypto.randomBytes(64).toString('hex');
    return { accessToken, refreshToken };
  }

  private async setSession(userId: string): Promise<void> {
    await this.redisService.set(
      `session:${userId}`,
      JSON.stringify({ userId, lastActivity: Date.now() }),
      this.SESSION_TTL,
    );
  }

  private normalizeIdentity(value: string): string {
    return value.trim().toLowerCase();
  }

  private async incrementRateLimitCounter(key: string, ttlSeconds: number): Promise<number> {
    const count = await this.redisService.client.incr(key);
    if (count === 1) {
      await this.redisService.client.expire(key, ttlSeconds);
    }
    return count;
  }

  private async enforceRateLimit(key: string, ttlSeconds: number, maxAttempts: number, message: string): Promise<void> {
    const count = await this.incrementRateLimitCounter(key, ttlSeconds);
    if (count > maxAttempts) {
      throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async ensureOtpNotLocked(identity: string): Promise<void> {
    const lockKey = `auth:otp:lock:${identity}`;
    const lock = await this.redisService.get(lockKey);
    if (lock) {
      throw new HttpException('Too many invalid OTP attempts. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async signup(email: string, password: string, ipAddress?: string): Promise<{ accessToken: string; refreshToken: string }> {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) throw new ConflictException('Email already registered');

    const totalUsers = await this.userRepository.countActiveUsers();
    let isFirstAdmin = totalUsers === 0;
    let role = isFirstAdmin ? UserRole.ADMIN : UserRole.VIEWER;

    if (isFirstAdmin) {
      const acquired = await this.redisService.setNx('auth:first-admin-lock', '1', 30);
      if (!acquired) {
        isFirstAdmin = false;
        role = UserRole.VIEWER;
      }
    }

    const hashed_password = await bcrypt.hash(password, 12);
    const user = await this.userRepository.create({ email, hashed_password, role, is_first_admin: isFirstAdmin });

    this.logger.log(`[AUDIT] User created: ${user.id} email=${email} role=${role}`);

    const { accessToken, refreshToken } = this.issueTokens(user.id, user.email, user.role);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.refreshTokenRepository.create({ userId: user.id, token: refreshToken, expiresAt, ipAddress });
    await this.setSession(user.id);

    return { accessToken, refreshToken };
  }

  async login(email: string, password: string, ipAddress: string): Promise<{ accessToken: string; refreshToken: string }> {
    const normalizedEmail = this.normalizeIdentity(email);
    await this.enforceRateLimit(
      `auth:login:email:${normalizedEmail}`,
      this.LOGIN_WINDOW_SECONDS,
      this.LOGIN_MAX_ATTEMPTS,
      'Too many login attempts. Please try again later.',
    );
    await this.enforceRateLimit(
      `auth:login:ip:${ipAddress}`,
      this.LOGIN_WINDOW_SECONDS,
      this.LOGIN_MAX_ATTEMPTS * 3,
      'Too many login attempts from this IP. Please try again later.',
    );

    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.hashed_password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const { accessToken, refreshToken } = this.issueTokens(user.id, user.email, user.role);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.refreshTokenRepository.create({ userId: user.id, token: refreshToken, expiresAt, ipAddress });
    await this.setSession(user.id);

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string, ipAddress: string): Promise<{ accessToken: string; refreshToken: string }> {
    await this.enforceRateLimit(
      `auth:refresh:ip:${ipAddress}`,
      this.REFRESH_WINDOW_SECONDS,
      this.REFRESH_MAX_ATTEMPTS_PER_IP,
      'Too many token refresh attempts from this IP. Please try again later.',
    );

    const tokenRecord = await this.refreshTokenRepository.findByHash(refreshToken);

    if (tokenRecord && tokenRecord.revoked) {
      this.logger.warn(`[SECURITY] Refresh token replay detected for family=${tokenRecord.token_family} user=${tokenRecord.user_id}`);
      await this.refreshTokenRepository.revokeFamily(tokenRecord.token_family);
      await this.redisService.del(`session:${tokenRecord.user_id}`);
      throw new UnauthorizedException('Token reuse detected — session revoked');
    }

    if (!tokenRecord || tokenRecord.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userRepository.findById(tokenRecord.user_id);
    if (!user) throw new UnauthorizedException('User not found');

    const session = await this.redisService.get(`session:${user.id}`);
    if (!session) throw new UnauthorizedException('Session expired due to inactivity');

    await this.refreshTokenRepository.revoke(refreshToken);

    const tokens = this.issueTokens(user.id, user.email, user.role);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.refreshTokenRepository.create({
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt,
      ipAddress,
      tokenFamily: tokenRecord.token_family,
    });

    await this.setSession(user.id);
    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenRecord = await this.refreshTokenRepository.findValid(refreshToken);
    if (tokenRecord) {
      await this.refreshTokenRepository.revokeFamily(tokenRecord.token_family);
      await this.redisService.del(`session:${tokenRecord.user_id}`);
    }
  }

  async requestOtp(email: string, ipAddress: string): Promise<void> {
    const normalizedEmail = this.normalizeIdentity(email);
    await this.ensureOtpNotLocked(normalizedEmail);
    await this.enforceRateLimit(
      `auth:otp:request:email:${normalizedEmail}`,
      this.OTP_REQUEST_WINDOW_SECONDS,
      this.OTP_REQUEST_MAX_ATTEMPTS_PER_EMAIL,
      'Too many OTP requests. Please try again later.',
    );
    await this.enforceRateLimit(
      `auth:otp:request:ip:${ipAddress}`,
      this.OTP_REQUEST_WINDOW_SECONDS,
      this.OTP_REQUEST_MAX_ATTEMPTS_PER_IP,
      'Too many OTP requests from this IP. Please try again later.',
    );

    const user = await this.userRepository.findByEmail(email);
    if (!user) return; // Silently succeed to prevent email enumeration

    // Generate 6-digit OTP
    const otp = String(crypto.randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Invalidate any existing OTPs for this user
    await this.otpRepository.update({ user_id: user.id, used: false }, { used: true });

    const otpRecord = this.otpRepository.create({ user_id: user.id, otp_code: otp, expires_at: expiresAt });
    await this.otpRepository.save(otpRecord);

    // Never log OTP values. Keep only metadata for audit/debug.
    this.logger.log(`[OTP] Password reset OTP issued for ${email} (expires ${expiresAt.toISOString()})`);
    // TODO: Wire nodemailer in production — use SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS env vars
  }

  async verifyOtp(email: string, otpCode: string, newPassword: string, ipAddress: string): Promise<void> {
    const normalizedEmail = this.normalizeIdentity(email);
    await this.ensureOtpNotLocked(normalizedEmail);
    await this.enforceRateLimit(
      `auth:otp:verify:ip:${ipAddress}`,
      this.OTP_VERIFY_WINDOW_SECONDS,
      this.OTP_REQUEST_MAX_ATTEMPTS_PER_IP,
      'Too many OTP verification attempts from this IP. Please try again later.',
    );

    const genericError = 'Invalid or expired OTP';

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      await this.trackOtpFailure(normalizedEmail);
      throw new BadRequestException(genericError);
    }

    const otpRecord = await this.otpRepository.findOne({
      where: { user_id: user.id, otp_code: otpCode, used: false },
      order: { created_at: 'DESC' },
    });

    if (!otpRecord || otpRecord.expires_at < new Date()) {
      await this.trackOtpFailure(normalizedEmail);
      throw new BadRequestException(genericError);
    }

    await this.otpRepository.update(otpRecord.id, { used: true });
    await this.redisService.del(`auth:otp:verify:fail:${normalizedEmail}`);
    await this.redisService.del(`auth:otp:lock:${normalizedEmail}`);

    const hashed_password = await bcrypt.hash(newPassword, 12);
    await this.userRepository.updatePassword(user.id, hashed_password);

    await this.refreshTokenRepository.revokeAllForUser(user.id);
    await this.redisService.del(`session:${user.id}`);
  }

  private async trackOtpFailure(normalizedEmail: string): Promise<void> {
    const failKey = `auth:otp:verify:fail:${normalizedEmail}`;
    const failedAttempts = await this.incrementRateLimitCounter(failKey, this.OTP_VERIFY_WINDOW_SECONDS);
    if (failedAttempts >= this.OTP_VERIFY_MAX_FAILED_ATTEMPTS) {
      await this.redisService.set(`auth:otp:lock:${normalizedEmail}`, '1', this.OTP_LOCK_SECONDS);
      await this.redisService.del(failKey);
      throw new HttpException('Too many invalid OTP attempts. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
