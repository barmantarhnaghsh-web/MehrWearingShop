import { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../lib/http-error';
import { logger } from '../lib/logger';
import { isProd } from '../config/env';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * Global error handler — single place that shapes every error response:
 *   { error: { code, message, details? } }
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }

  // Malformed JSON payloads are client errors, not server crashes.
  if ((err as { type?: string })?.type === 'entity.parse.failed') {
    res.status(400).json({
      error: { code: 'BAD_JSON', message: 'Request body is not valid JSON' },
    });
    return;
  }

  // Prisma unique-constraint (P2002) → 409 with a friendly message.
  const prismaErr = err as { code?: string; meta?: { target?: string[] } };
  if (prismaErr?.code === 'P2002') {
    const fields = prismaErr.meta?.target?.join(', ') ?? 'field';
    res.status(409).json({
      error: { code: 'CONFLICT', message: `A record with this ${fields} already exists` },
    });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  logger.error({ err, path: req.path }, 'unhandled error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isProd ? 'Something went wrong on our side' : (err as Error)?.message ?? 'Internal error',
    },
  });
};
