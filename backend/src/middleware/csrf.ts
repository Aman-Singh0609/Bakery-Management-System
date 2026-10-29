import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from '../lib/errors';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function originOf(value: string | undefined) {
  if (!value) return undefined;
  try {
    return new URL(value).origin;
  } catch {
    return 'invalid';
  }
}

/**
 * Cookie-authenticated APIs need CSRF protection. Browsers always attach an Origin
 * (or at least a Referer) to cross-site state-changing requests, so any unsafe
 * request whose origin is not on the allowlist is rejected. Requests with neither
 * header come from non-browser clients, which cannot ride a victim's cookies.
 *
 * Together with SameSite=Lax cookies and JSON-only bodies this blocks form-based CSRF.
 */
export function requireTrustedOrigin(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = originOf(req.headers.origin) ?? originOf(req.headers.referer);
  if (origin === undefined) return next();
  if (env.corsOrigins.includes(origin)) return next();

  return next(new AppError(403, 'Request origin is not allowed', 'CSRF_REJECTED'));
}

/** State-changing requests must be JSON so that plain HTML forms can never reach the API. */
export function requireJsonBody(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  const length = Number(req.headers['content-length'] ?? 0);
  const hasBody = length > 0 || req.headers['transfer-encoding'] !== undefined;
  if (!hasBody) return next();
  if (req.is('application/json')) return next();
  return next(new AppError(415, 'Request body must be JSON', 'UNSUPPORTED_MEDIA_TYPE'));
}
