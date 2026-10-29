import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const message = { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } };

const common = {
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
  message,
  skip: () => env.isTest,
};

export const globalLimiter = rateLimit({ ...common, windowMs: 15 * 60 * 1000, limit: 600 });

/** Brute-force protection for login, registration and password changes. */
export const authLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
});

export const refreshLimiter = rateLimit({ ...common, windowMs: 15 * 60 * 1000, limit: 120 });

export const checkoutLimiter = rateLimit({ ...common, windowMs: 15 * 60 * 1000, limit: 40 });
