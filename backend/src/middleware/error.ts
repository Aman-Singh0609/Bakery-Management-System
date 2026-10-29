import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import { logger } from '../config/logger';
import { env } from '../config/env';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.issues[0]?.message ?? 'Request validation failed',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // body-parser errors (malformed JSON, payload too large) carry a 4xx status.
  const status = (err as { status?: number; type?: string })?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    const type = (err as { type?: string }).type;
    const messageText =
      type === 'entity.too.large'
        ? 'Request body is too large'
        : type === 'entity.parse.failed'
          ? 'Request body is not valid JSON'
          : 'Bad request';
    return res.status(status).json({ error: { code: 'BAD_REQUEST', message: messageText } });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'A record with that value already exists' } });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
    }
  }

  logger.error({ err, requestId: req.requestId, path: req.path, method: req.method }, 'Unhandled error');

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
      ...(env.isProd ? {} : { detail: err instanceof Error ? err.message : String(err) }),
    },
  });
}
