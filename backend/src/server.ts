import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';
import { createApp } from './app';
import { startOutboxWorker, stopOutboxWorker } from './jobs/outbox';

async function main() {
  await prisma.$connect();
  logger.info('Connected to PostgreSQL');

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Amy Bakery API started');
  });

  startOutboxWorker();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully');
    stopOutboxWorker();
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => logger.error({ reason }, 'Unhandled rejection'));
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    process.exit(1);
  });
}

main().catch((error) => {
  logger.fatal({ err: error }, 'Failed to start server');
  process.exit(1);
});
