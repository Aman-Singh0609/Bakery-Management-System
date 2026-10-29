import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Prisma runs with the JS query compiler and the `pg` driver adapter
 * (generator `engineType = "client"`), so no native query-engine binary is needed
 * at runtime. The connection string comes straight from DATABASE_URL.
 */
export function createPrismaClient(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter, log: ['error', 'warn'] });
}

export const prisma = createPrismaClient();
