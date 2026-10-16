import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/http-error';
import { requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { evaluateCoupon } from '../../lib/money';

export const couponsAdminRouter = Router();
couponsAdminRouter.use(requireAdmin);

const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,24}$/),
  descriptionFa: z.string().max(200).optional(),
  descriptionEn: z.string().max(200).optional(),
  type: z.enum(['PERCENT', 'FIXED']),
  value: z.number().int().positive(),
  minOrderAmount: z.number().int().nonnegative().nullable().optional(),
  maxDiscount: z.number().int().nonnegative().nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  perUserLimit: z.number().int().positive().optional(),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional(),
});

couponsAdminRouter.get('/', async (_req, res) => {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ data: coupons });
});

couponsAdminRouter.post('/', validate({ body: couponSchema }), async (req, res) => {
  const exists = await prisma.coupon.findUnique({ where: { code: req.body.code } });
  if (exists) throw ApiError.conflict('Coupon code already exists');
  const coupon = await prisma.coupon.create({ data: req.body });
  res.status(201).json({ data: coupon });
});

couponsAdminRouter.patch('/:code', validate({ body: couponSchema.partial().omit({ code: true }) }), async (req, res) => {
  const existing = await prisma.coupon.findUnique({ where: { code: req.params.code.toUpperCase() } });
  if (!existing) throw ApiError.notFound('Coupon not found');
  const coupon = await prisma.coupon.update({ where: { code: existing.code }, data: req.body });
  res.json({ data: coupon });
});

couponsAdminRouter.delete('/:code', async (req, res) => {
  const existing = await prisma.coupon.findUnique({ where: { code: req.params.code.toUpperCase() } });
  if (!existing) throw ApiError.notFound('Coupon not found');
  await prisma.coupon.delete({ where: { code: existing.code } });
  res.json({ data: { deleted: true } });
});

/** Public endpoint: dry-run validate a code for the checkout screen. */
export const couponCheckRouter = Router();
couponCheckRouter.post('/check', async (req, res) => {
  const code = String(req.body?.code ?? '').toUpperCase();
  const subtotal = Number(req.body?.subtotal ?? 0);
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) throw ApiError.notFound('Coupon not found');
  const result = evaluateCoupon(coupon, subtotal);
  if (!result.valid) {
    throw ApiError.unprocessable('Coupon is not applicable', { reason: result.reason });
  }
  res.json({
    data: {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount: result.discount,
      descriptionFa: coupon.descriptionFa,
      descriptionEn: coupon.descriptionEn,
    },
  });
});
