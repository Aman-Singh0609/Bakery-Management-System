import 'dotenv/config';
import { z } from 'zod';

const PLACEHOLDER_SECRETS = [
  'replace-with-at-least-32-random-characters',
  'replace-with-a-different-at-least-32-random-string',
];

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(8000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
    ACCESS_TOKEN_TTL: z
      .string()
      .regex(/^\d+[smhd]$/, 'ACCESS_TOKEN_TTL must look like 15m, 1h, 30s or 1d')
      .default('15m'),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().max(90).default(7),
    CORS_ORIGINS: z.string().default('http://localhost:3000'),
    COOKIE_DOMAIN: z.string().optional(),
    COOKIE_SECURE: z.enum(['true', 'false']).optional(),
    // Which upstream proxies may set X-Forwarded-For. Never trust arbitrary clients,
    // otherwise rate limits can be bypassed by spoofing the header.
    TRUST_PROXY: z.string().default('loopback, uniquelocal'),
    APP_URL: z.string().url().default('http://localhost:3000'),
    DELIVERY_FEE: z.coerce.number().nonnegative().default(0),
    FREE_DELIVERY_ABOVE: z.coerce.number().nonnegative().default(0),
    MAX_OPEN_ORDERS_PER_CUSTOMER: z.coerce.number().int().positive().default(5),
    // Orders advance automatically after these delays. A delay of 0 disables that stage.
    AUTO_PROGRESS_ENABLED: z.enum(['true', 'false']).default('true'),
    AUTO_PREPARE_AFTER_MINUTES: z.coerce.number().int().nonnegative().max(1440).default(10),
    AUTO_OUT_FOR_DELIVERY_AFTER_MINUTES: z.coerce.number().int().nonnegative().max(1440).default(30),
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
    LOG_LEVEL: z.string().default('info'),
    ADMIN_EMAIL: z.string().email().optional().or(z.literal('')),
    ADMIN_PASSWORD: z.string().optional(),
    SEED_SAMPLE_PRODUCTS: z.enum(['true', 'false']).default('true'),
  })
  .superRefine((value, ctx) => {
    if (value.JWT_ACCESS_SECRET === value.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_SECRET'],
        message: 'must be different from JWT_ACCESS_SECRET',
      });
    }
    if (value.NODE_ENV === 'production') {
      for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
        if (PLACEHOLDER_SECRETS.includes(value[key])) {
          ctx.addIssue({ code: 'custom', path: [key], message: 'is still the example placeholder' });
        }
      }
    }
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

const data = parsed.data;

function parseTrustProxy(value: string): boolean | number | string {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false' || trimmed === '') return false;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function ttlToMs(ttl: string) {
  const amount = Number(ttl.slice(0, -1));
  const unit = ttl.slice(-1);
  const factor = unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
  return amount * factor;
}

export const env = {
  ...data,
  corsOrigins: data.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean),
  trustProxy: parseTrustProxy(data.TRUST_PROXY),
  accessTokenTtlMs: ttlToMs(data.ACCESS_TOKEN_TTL),
  autoProgressEnabled: data.AUTO_PROGRESS_ENABLED === 'true',
  isProd: data.NODE_ENV === 'production',
  isTest: data.NODE_ENV === 'test',
  cookieSecure: data.COOKIE_SECURE ? data.COOKIE_SECURE === 'true' : data.NODE_ENV === 'production',
};
