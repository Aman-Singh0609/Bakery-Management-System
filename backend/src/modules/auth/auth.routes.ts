import { Router, type Response } from 'express';
import { z } from 'zod';
import type { Role, User } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { asyncHandler, badRequest, unauthorized } from '../../lib/errors';
import { burnPasswordCheck, hashPassword, passwordPolicy, verifyPassword } from '../../lib/password';
import { audit } from '../../lib/audit';
import { createRefreshToken, refreshTokenExpiry, refreshTokenHash, signAccessToken } from '../../lib/tokens';
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from '../../lib/cookies';
import { authenticate } from '../../middleware/auth';
import { authLimiter, refreshLimiter } from '../../middleware/rateLimit';
import { env } from '../../config/env';

const router = Router();

const email = z.string().trim().toLowerCase().email('Please enter a valid email').max(255);
const phone = z.string().trim().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number');
const name = z.string().trim().min(2, 'Please enter your name').max(120);

const registerSchema = z.object({
  name,
  email,
  password: passwordPolicy,
  phone: phone.optional(),
});

// Login only checks the length bounds; the full policy applies when a password is set.
const loginSchema = z.object({ email, password: z.string().min(1, 'Password is required').max(200) });

const publicUser = (user: Pick<User, 'id' | 'name' | 'email' | 'phone' | 'role' | 'createdAt'>) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  createdAt: user.createdAt,
});

async function issueSession(user: { id: string; email: string; role: Role }, res: Response) {
  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  const { token, tokenHash } = createRefreshToken();
  await prisma.refreshToken.create({
    data: { tokenHash, userId: user.id, expiresAt: refreshTokenExpiry() },
  });
  setAuthCookies(res, accessToken, token, env.REFRESH_TOKEN_TTL_DAYS);
}

router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return res
        .status(409)
        .json({ error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists. Try signing in.' } });
    }

    let user;
    try {
      user = await prisma.user.create({
        data: {
          name: body.name,
          email: body.email,
          phone: body.phone,
          passwordHash: await hashPassword(body.password),
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        return res
          .status(409)
          .json({ error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists. Try signing in.' } });
      }
      throw error;
    }

    await issueSession(user, res);
    return res.status(201).json({ user: publicUser(user) });
  }),
);

router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      await burnPasswordCheck(body.password);
      throw unauthorized('Invalid email or password');
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) throw unauthorized('Invalid email or password');

    await issueSession(user, res);
    if (user.role !== 'CUSTOMER') await audit(req, 'auth.login', 'user', user.id);
    return res.json({ user: publicUser(user) });
  }),
);

router.post(
  '/refresh',
  refreshLimiter,
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) throw unauthorized('No refresh token');

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: refreshTokenHash(token) },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      clearAuthCookies(res);
      throw unauthorized('Session expired. Please sign in again.');
    }

    // A revoked token being presented again means it was stolen or replayed:
    // end every session for that user.
    if (stored.revokedAt) {
      // Two tabs refreshing at the same moment both send the old token. Within a few
      // seconds of rotation that is a benign race: the browser already has the new
      // cookie, so tell the client to simply retry.
      if (stored.rotatedAt && Date.now() - stored.rotatedAt.getTime() < 10_000) {
        return res.status(409).json({ error: { code: 'REFRESH_RACE', message: 'Session was just refreshed; retry.' } });
      }
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      clearAuthCookies(res);
      throw unauthorized('Session expired. Please sign in again.');
    }

    const now = new Date();
    const consumed = await prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: now, rotatedAt: now },
    });
    if (consumed.count !== 1) {
      clearAuthCookies(res);
      throw unauthorized('Session expired. Please sign in again.');
    }

    await issueSession(stored.user, res);
    return res.json({ user: publicUser(stored.user) });
  }),
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (token) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: refreshTokenHash(token), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    clearAuthCookies(res);
    return res.status(204).send();
  }),
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw unauthorized();
    return res.json({ user: publicUser(user) });
  }),
);

router.patch(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: name.optional(),
        phone: phone.nullable().optional().or(z.literal('').transform(() => null)),
      })
      .strict()
      .parse(req.body);

    const user = await prisma.user.update({ where: { id: req.user!.id }, data: body });
    return res.json({ user: publicUser(user) });
  }),
);

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(200),
  newPassword: passwordPolicy,
});

router.post(
  '/change-password',
  authenticate,
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = changePasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw unauthorized();

    const valid = await verifyPassword(body.currentPassword, user.passwordHash);
    if (!valid) throw badRequest('Your current password is incorrect');
    if (body.currentPassword === body.newPassword) {
      throw badRequest('Your new password must be different from the current one');
    }

    const newPasswordHash = await hashPassword(body.newPassword);

    // Changing the password signs out every other device.
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash: newPasswordHash } }),
      prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await audit(req, 'user.password_change', 'user', user.id);
    await issueSession(user, res);

    return res.json({ message: 'Password updated. Other devices have been signed out.' });
  }),
);

export default router;
