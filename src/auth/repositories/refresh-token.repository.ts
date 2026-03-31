import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import * as crypto from 'crypto';

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repo: Repository<RefreshToken>,
  ) {}

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async create(data: {
    userId: string;
    token: string;
    expiresAt: Date;
    ipAddress?: string;
    tokenFamily?: string;
  }): Promise<void> {
    const record = this.repo.create({
      user_id: data.userId,
      token_hash: this.hashToken(data.token),
      token_family: data.tokenFamily ?? crypto.randomUUID(),
      expires_at: data.expiresAt,
      revoked: false,
      ip_address: data.ipAddress ?? null,
    });
    await this.repo.save(record);
  }

  async findValid(token: string): Promise<RefreshToken | null> {
    const hash = this.hashToken(token);
    return this.repo.findOne({
      where: { token_hash: hash, revoked: false },
    });
  }

  async findByHash(token: string): Promise<RefreshToken | null> {
    const hash = this.hashToken(token);
    return this.repo.findOne({ where: { token_hash: hash } });
  }

  async revoke(token: string): Promise<void> {
    const hash = this.hashToken(token);
    await this.repo.update({ token_hash: hash }, { revoked: true });
  }

  async revokeFamily(tokenFamily: string): Promise<void> {
    await this.repo.update({ token_family: tokenFamily, revoked: false }, { revoked: true });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.repo.update({ user_id: userId, revoked: false }, { revoked: true });
  }
}
