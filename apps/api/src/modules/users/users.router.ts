import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/http-error';
import { currentUser, loadUser, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { publicUser } from '../auth/auth.service';

export const usersRouter = Router();
// NOTE: guard each route (not router.use) — this router is mounted at the API
// root, so a blanket middleware would block unrelated public endpoints.

const updateMeSchema = z.object({
  firstName: z.string().min(1).max(60).optional(),
  lastName: z.string().min(1).max(60).optional(),
  phone: z
    .string()
    .regex(/^09\d{9}$/)
    .optional(),
});

const addressSchema = z.object({
  fullName: z.string().min(3).max(80),
  phone: z.string().regex(/^09\d{9}$/),
  province: z.string().min(1).max(60),
  city: z.string().min(1).max(60),
  postalCode: z.string().regex(/^\d{10}$/, 'postal code must be 10 digits'),
  addressLine: z.string().min(5).max(300),
  isDefault: z.boolean().optional(),
});

usersRouter.get('/me', requireAuth, async (req, res) => {
  const user = await loadUser(currentUser(req).id);
  res.json({ data: publicUser(user) });
});

usersRouter.patch('/me', requireAuth, validate({ body: updateMeSchema }), async (req, res) => {
  const user = await prisma.user.update({ where: { id: currentUser(req).id }, data: req.body });
  res.json({ data: publicUser(user) });
});

usersRouter.get('/me/addresses', requireAuth, async (req, res) => {
  const addresses = await prisma.address.findMany({
    where: { userId: currentUser(req).id },
    orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
  });
  res.json({ data: addresses });
});

usersRouter.post('/me/addresses', requireAuth, validate({ body: addressSchema }), async (req, res) => {
  const userId = currentUser(req).id;
  if (req.body.isDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  const address = await prisma.address.create({ data: { ...req.body, userId } });
  res.status(201).json({ data: address });
});

usersRouter.patch('/me/addresses/:id', requireAuth, validate({ body: addressSchema.partial() }), async (req, res) => {
  const userId = currentUser(req).id;
  const existing = await prisma.address.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) throw ApiError.notFound('Address not found');
  if (req.body.isDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  const address = await prisma.address.update({ where: { id: existing.id }, data: req.body });
  res.json({ data: address });
});

usersRouter.delete('/me/addresses/:id', requireAuth, async (req, res) => {
  const userId = currentUser(req).id;
  const existing = await prisma.address.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) throw ApiError.notFound('Address not found');
  await prisma.address.delete({ where: { id: existing.id } });
  res.json({ data: { deleted: true } });
});
