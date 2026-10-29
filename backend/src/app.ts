import crypto from 'crypto';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';
import { globalLimiter } from './middleware/rateLimit';
import { authenticate, requireRole } from './middleware/auth';
import { requireJsonBody, requireTrustedOrigin } from './middleware/csrf';
import { errorHandler, notFoundHandler } from './middleware/error';
import { AppError } from './lib/errors';
import authRoutes from './modules/auth/auth.routes';
import productRoutes from './modules/products/products.routes';
import adminProductRoutes from './modules/products/admin-products.routes';
import orderRoutes from './modules/orders/orders.routes';
import paymentRoutes, { razorpayWebhookHandler } from './modules/payments/payments.routes';
import adminRoutes from './modules/admin/admin.routes';

const REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;

export function createApp() {
  const app = express();

  app.set('trust proxy', env.trustProxy);
  app.disable('x-powered-by');
  app.disable('etag');

  // The API only serves JSON, so lock the CSP right down.
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
        return callback(new AppError(403, 'Origin not allowed', 'CORS_DENIED'));
      },
      credentials: true,
      allowedHeaders: ['Content-Type', 'Idempotency-Key', 'X-Request-Id'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      maxAge: 600,
    }),
  );

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id = typeof incoming === 'string' && REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();
        (req as express.Request).requestId = id;
        res.setHeader('X-Request-Id', id);
        return id;
      },
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
      autoLogging: { ignore: (req) => req.url?.startsWith('/health') ?? false },
    }),
  );

  app.get('/health/live', (_req, res) => res.json({ status: 'ok' }));
  app.get('/health/ready', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return res.json({ status: 'ready' });
    } catch {
      return res.status(503).json({ status: 'unavailable' });
    }
  });
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use(cookieParser());
  app.use('/api', globalLimiter);
  // API responses contain personal data; never let browsers or proxies cache them.
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Razorpay signs the raw body, so the webhook gets it before any JSON parsing.
  // It is authenticated by HMAC, not cookies, so it sits outside the CSRF checks.
  app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json', limit: '1mb' }), razorpayWebhookHandler);

  app.use('/api', requireTrustedOrigin, requireJsonBody);
  app.use(express.json({ limit: '100kb', strict: true }));

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1', productRoutes);
  app.use('/api/v1/orders', authenticate, orderRoutes);
  app.use('/api/v1/payments', authenticate, paymentRoutes);
  app.use('/api/v1/admin', authenticate, requireRole('ADMIN', 'STAFF'), adminProductRoutes, adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
