import type { Request } from 'express';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';

/** Audit failures are logged but never break the request that triggered them. */
export async function audit(
  req: Request,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action,
        entity,
        entityId,
        metadata: metadata as never,
        ip: req.ip,
      },
    });
  } catch (error) {
    logger.error({ err: error, action, entity, entityId }, 'Failed to write audit log');
  }
}
