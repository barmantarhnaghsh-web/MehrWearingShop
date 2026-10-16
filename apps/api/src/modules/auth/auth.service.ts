import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Role } from '@prisma/client';
import { env } from '../../config/env';
import { ApiError } from '../../lib/http-error';
import { prisma } from '../../lib/prisma';
import { signAccessToken } from '../../middleware/auth';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueTokens(userId: string, role: Role): Promise<TokenPair> {
  const refreshToken = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_TTL_DAYS);

  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashToken(refreshToken), expiresAt },
  });

  return {
    accessToken: signAccessToken({ id: userId, role }),
    refreshToken,
    expiresIn: env.ACCESS_TOKEN_TTL,
  };
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  /** Guest cart to merge into the fresh account (mobile apps send x-cart-id). */
  guestCartId?: string;
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  if (input.phone) {
    const phoneTaken = await prisma.user.findUnique({ where: { phone: input.phone } });
    if (phoneTaken) throw ApiError.conflict('An account with this phone number already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      cart: { create: {} },
    },
  });

  if (input.guestCartId) await mergeGuestCart(input.guestCartId, user.id);

  return { user: publicUser(user), tokens: await issueTokens(user.id, user.role) };
}

export async function login(input: { email: string; password: string; guestCartId?: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user?.passwordHash) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.forbidden('This account has been disabled');

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid email or password');

  if (input.guestCartId) await mergeGuestCart(input.guestCartId, user.id);

  return { user: publicUser(user), tokens: await issueTokens(user.id, user.role) };
}

export async function refresh(refreshToken: string) {
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  // Rotate: revoke the used token and issue a fresh pair (detects token theft).
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user?.isActive) throw ApiError.forbidden('This account has been disabled');

  return issueTokens(user.id, user.role);
}

export async function logout(refreshToken?: string) {
  if (!refreshToken) return { revoked: false };
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) } });
  if (!stored) return { revoked: false };
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  return { revoked: true };
}

// ---------------------------------------------------------------------------
// Phone OTP (dev mode: code is returned by the API instead of sending SMS)
// ---------------------------------------------------------------------------

export async function requestOtp(phone: string) {
  const code = String(Math.floor(10000 + Math.random() * 90000));
  await prisma.otpCode.create({
    data: { phone, code, expiresAt: new Date(Date.now() + 2 * 60 * 1000) },
  });
  // In production replace with an SMS provider call (Kavenegar / SMS.ir).
  return { code, expiresInSec: 120 };
}

export async function verifyOtp(phone: string, code: string) {
  const record = await prisma.otpCode.findFirst({
    where: { phone, code, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!record) throw ApiError.unauthorized('OTP code is invalid or expired');
  await prisma.otpCode.update({ where: { id: record.id }, data: { usedAt: new Date() } });

  let user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: `${phone}@mwrshop.ir`,
        phone,
        firstName: 'مشتری',
        lastName: 'عزیز',
        cart: { create: {} },
      },
    });
  }
  if (!user.isActive) throw ApiError.forbidden('This account has been disabled');

  return { user: publicUser(user), tokens: await issueTokens(user.id, user.role) };
}

// ---------------------------------------------------------------------------

export function publicUser(user: {
  id: string;
  email: string;
  phone: string | null;
  role: Role;
  firstName: string;
  lastName: string;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    createdAt: user.createdAt,
  };
}

/**
 * Merge a guest cart into the user's cart: quantities are summed, the guest
 * cart is then deleted. Used by web + mobile so a login never loses a cart.
 */
async function mergeGuestCart(guestCartId: string, userId: string) {
  const [guestCart, userCart] = await Promise.all([
    prisma.cart.findUnique({ where: { guestId: guestCartId }, include: { items: true } }),
    prisma.cart.findUnique({ where: { userId }, include: { items: true } }),
  ]);
  if (!guestCart) return;
  if (!userCart) {
    await prisma.cart.update({ where: { id: guestCart.id }, data: { userId, guestId: null } });
    return;
  }

  for (const item of guestCart.items) {
    const existing = userCart.items.find((i) => i.variantId === item.variantId);
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + item.quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: userCart.id, variantId: item.variantId, quantity: item.quantity },
      });
    }
  }
  await prisma.cart.delete({ where: { id: guestCart.id } }).catch(() => undefined);
}
