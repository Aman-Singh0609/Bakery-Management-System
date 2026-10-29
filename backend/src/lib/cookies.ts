import type { CookieOptions, Response } from 'express';
import { env } from '../config/env';

export const ACCESS_COOKIE = 'amy_access';
export const REFRESH_COOKIE = 'amy_refresh';

const base: CookieOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: 'lax',
  domain: env.COOKIE_DOMAIN || undefined,
  path: '/',
};

// The refresh cookie is only ever needed by the auth endpoints, so it is not sent
// with every API request.
const refreshCookie: CookieOptions = { ...base, path: '/api/v1/auth' };

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string, refreshDays: number) {
  res.cookie(ACCESS_COOKIE, accessToken, { ...base, maxAge: env.accessTokenTtlMs });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...refreshCookie, maxAge: refreshDays * 24 * 60 * 60 * 1000 });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, refreshCookie);
  // Clear the legacy root-path refresh cookie set by earlier versions.
  res.clearCookie(REFRESH_COOKIE, base);
}
