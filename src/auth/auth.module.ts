import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { User } from './entities/user.entity';
import { UserOrgAssignment } from './entities/user-org-assignment.entity';
import { UserRepoAssignment } from './entities/user-repo-assignment.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetOtp } from './entities/password-reset-otp.entity';
import { AuditLog } from './entities/audit-log.entity';

import { UserRepository } from './repositories/user.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { AuditLogRepository } from './repositories/audit-log.repository';

import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtGuard } from './guards/jwt.guard';
import { RolesGuard } from './guards/roles.guard';
import { OrgScopingGuard } from './guards/org-scoping.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserOrgAssignment,
      UserRepoAssignment,
      RefreshToken,
      PasswordResetOtp,
      AuditLog,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    UserRepository,
    RefreshTokenRepository,
    AuditLogRepository,
    JwtGuard,
    RolesGuard,
    OrgScopingGuard,
  ],
  exports: [
    AuthService,
    JwtGuard,
    RolesGuard,
    OrgScopingGuard,
    UserRepository,
    AuditLogRepository,
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule {}
