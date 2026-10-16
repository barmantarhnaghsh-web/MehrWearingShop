import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { ApiError } from '../lib/http-error';
import { prisma } from '../lib/prisma';

export interface AuthUser {
  id: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signAccessToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AuthUser {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
    if (!payload.sub || !payload.role) throw new Error('bad payload');
    return { id: String(payload.sub), role: payload.role as Role };
  } catch {
    throw ApiError.unauthorized('Invalid or expired access token');
  }
}

function bearerFrom(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

/** Requires a valid access token. */
export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const token = bearerFrom(req);
  if (!token) return next(ApiError.unauthorized());
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    next(err);
  }
};

/** Requires the authenticated user to hold the ADMIN role. */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    if (req.user?.role !== 'ADMIN') return next(ApiError.forbidden('Admin access required'));
    next();
  });
};

/** Attaches req.user when a valid token is present, otherwise continues anonymously. */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const token = bearerFrom(req);
  if (token) {
    try {
      req.user = verifyAccessToken(token);
    } catch {
      // anonymous access is still allowed
    }
  }
  next();
};

/** Convenience guard for services. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

/** Load the full user row or 404. */
export async function loadUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  return user;
}
