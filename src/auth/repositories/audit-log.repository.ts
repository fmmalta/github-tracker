import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditLogRepository {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async log(data: {
    userId: string | null;
    method: string;
    path: string;
    statusCode: number;
    ipAddress: string | null;
    durationMs: number | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const entry = this.repo.create({
      user_id: data.userId,
      method: data.method,
      path: data.path,
      status_code: data.statusCode,
      ip_address: data.ipAddress,
      duration_ms: data.durationMs,
      metadata: data.metadata ?? null,
    });
    // Fire-and-forget: don't block the response on audit logging
    this.repo.save(entry).catch(err => {
      console.error('[AuditLog] Failed to save audit entry:', err);
    });
  }
}
