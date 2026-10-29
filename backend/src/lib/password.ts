import bcrypt from 'bcryptjs';
import { z } from 'zod';

const ROUNDS = 12;

// Used to keep login timing the same whether or not the account exists.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', ROUNDS);

export const hashPassword = (plain: string) => bcrypt.hash(plain, ROUNDS);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);
export const burnPasswordCheck = (plain: string) => bcrypt.compare(plain, DUMMY_HASH);

/** bcrypt only reads the first 72 bytes, so longer passwords are rejected rather than silently truncated. */
export const passwordPolicy = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 bytes')
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), 'Password must contain a letter and a number');
