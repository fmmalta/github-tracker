import {
  Injectable, ConflictException, UnauthorizedException,
  BadRequestException, Logger,
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
    const refreshToken = crypto.randomBytes(64).toString('hex'); // opaque token
    return { accessToken, refreshToken };
  }

  private async setSession(userId: string): Promise<void> {
    await this.redisService.set(
      `session:${userId}`,
      JSON.stringify({ userId, lastActivity: Date.now() }),
      this.SESSION_TTL,
    );
  }

  async signup(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) throw new ConflictException('Email already registered');

    const totalUsers = await this.userRepository.countActiveUsers();
    const isFirstAdmin = totalUsers === 0;
    const role = isFirstAdmin ? UserRole.ADMIN : UserRole.VIEWER;

    const hashed_password = await bcrypt.hash(password, 12);
    const user = await this.userRepository.create({ email, hashed_password, role, is_first_admin: isFirstAdmin });

    this.logger.log(`[AUDIT] User created: ${user.id} email=${email} role=${role}`);

    const { accessToken, refreshToken } = this.issueTokens(user.id, user.email, user.role);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.refreshTokenRepository.create({ userId: user.id, token: refreshToken, expiresAt });
    await this.setSession(user.id);

    return { accessToken, refreshToken };
  }

  async login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.hashed_password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const { accessToken, refreshToken } = this.issueTokens(user.id, user.email, user.role);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.refreshTokenRepository.create({ userId: user.id, token: refreshToken, expiresAt });
    await this.setSession(user.id);

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const tokenRecord = await this.refreshTokenRepository.findValid(refreshToken);
    if (!tokenRecord || tokenRecord.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userRepository.findById(tokenRecord.user_id);
    if (!user) throw new UnauthorizedException('User not found');

    // Check Redis session (inactivity timeout)
    const session = await this.redisService.get(`session:${user.id}`);
    if (!session) throw new UnauthorizedException('Session expired due to inactivity');

    await this.setSession(user.id); // Reset inactivity timer
    const { accessToken } = this.issueTokens(user.id, user.email, user.role);
    return { accessToken };
  }

  async requestOtp(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) return; // Silently succeed to prevent email enumeration

    // Generate 6-digit OTP
    const otp = String(crypto.randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Invalidate any existing OTPs for this user
    await this.otpRepository.update({ user_id: user.id, used: false }, { used: true });

    const otpRecord = this.otpRepository.create({ user_id: user.id, otp_code: otp, expires_at: expiresAt });
    await this.otpRepository.save(otpRecord);

    // In development: log OTP to console. In production: send via nodemailer.
    this.logger.log(`[OTP] Password reset OTP for ${email}: ${otp} (expires ${expiresAt.toISOString()})`);
    // TODO: Wire nodemailer in production — use SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS env vars
  }

  async verifyOtp(email: string, otpCode: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new BadRequestException('Invalid OTP or email');

    const otpRecord = await this.otpRepository.findOne({
      where: { user_id: user.id, otp_code: otpCode, used: false },
      order: { created_at: 'DESC' },
    });

    if (!otpRecord) throw new BadRequestException('Invalid OTP code');
    if (otpRecord.expires_at < new Date()) throw new BadRequestException('OTP has expired');

    await this.otpRepository.update(otpRecord.id, { used: true });

    const hashed_password = await bcrypt.hash(newPassword, 12);
    await this.userRepository.updatePassword(user.id, hashed_password);

    // Revoke all refresh tokens (force re-login after password change)
    await this.refreshTokenRepository.revokeAllForUser(user.id);
    await this.redisService.del(`session:${user.id}`);
  }
}
