import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditLogRepository } from '../../auth/repositories/audit-log.repository';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditMiddleware.name);

  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const user = (req as any).user as { id?: string } | undefined;

    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      const userId = user?.id ?? null;
      const ipAddress = req.ip ?? req.socket.remoteAddress ?? null;

      this.auditLogRepository.log({
        userId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        ipAddress,
        durationMs,
      });
    });

    next();
  }
}
