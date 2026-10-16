import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

/**
 * Singleton Prisma client — one connection pool per Node process.
 */
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export async function connectPrisma() {
  await prisma.$connect();
  logger.info('database connected');
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
