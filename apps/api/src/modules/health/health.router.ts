import { Router } from 'express';
import { prisma } from '../../lib/prisma';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  let db: 'up' | 'down' = 'down';
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = 'up';
  } catch {
    db = 'down';
  }
  res.status(db === 'up' ? 200 : 503).json({
    data: {
      status: db === 'up' ? 'ok' : 'degraded',
      db,
      version: process.env.npm_package_version ?? '1.0.0',
      uptimeSec: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});
