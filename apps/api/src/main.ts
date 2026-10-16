import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { connectPrisma, disconnectPrisma, prisma } from './lib/prisma';

async function main() {
  await connectPrisma();
  const app = createApp();

  const server = app.listen(env.API_PORT, '0.0.0.0', () => {
    logger.info(`MehrWearingShop API listening on :${env.API_PORT} (${env.NODE_ENV})`);
    logger.info(`OpenAPI docs: ${env.API_PUBLIC_URL}/api/docs`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await disconnectPrisma();
      process.exit(0);
    });
    // Hard exit if something hangs.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => logger.error({ reason }, 'unhandled rejection'));
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaught exception');
    process.exit(1);
  });
}

main().catch(async (err) => {
  logger.fatal({ err }, 'failed to start API');
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
