import rateLimit from 'express-rate-limit';
import { ApiError } from '../lib/http-error';
import { env } from '../config/env';

/** Tight limiter for auth endpoints (brute-force protection). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => next(ApiError.tooMany()),
});

/** Generous limiter for the rest of the public API. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => next(ApiError.tooMany()),
});
