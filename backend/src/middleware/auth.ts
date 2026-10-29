import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { verifyAccessToken } from '../lib/tokens';
import { forbidden, unauthorized } from '../lib/errors';
import { ACCESS_COOKIE } from '../lib/cookies';
import { prisma } from '../config/prisma';

export interface AuthUser {
  id: string;
  role: Role;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      requestId?: string;
    }
  }
}

function readToken(req: Request) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[ACCESS_COOKIE] as string | undefined;
}

/**
 * Verifies the access token, then re-reads the user so that a deleted account or a
 * changed role takes effect immediately instead of when the token expires.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) return next(unauthorized());

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(unauthorized('Session expired. Please sign in again.'));
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, email: true },
    });
    if (!user) return next(unauthorized('Session expired. Please sign in again.'));
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    return next();
  };
}
