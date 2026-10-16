import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { currentUser, requireAuth } from '../../middleware/auth';
import { productPublic } from '../../lib/catalog.mapper';

export const wishlistRouter = Router();
wishlistRouter.use(requireAuth);

/** GET /wishlist */
wishlistRouter.get('/', async (req, res) => {
  const items = await prisma.wishlistItem.findMany({
    where: { userId: currentUser(req).id },
    include: { product: { include: { category: true, brand: true, variants: { where: { isActive: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: items.map((i) => productPublic(i.product)) });
});

/** POST /wishlist/:productId — toggle-style add (idempotent). */
wishlistRouter.post('/:productId', async (req, res) => {
  const userId = currentUser(req).id;
  const item = await prisma.wishlistItem.upsert({
    where: { userId_productId: { userId, productId: req.params.productId } },
    create: { userId, productId: req.params.productId },
    update: {},
  });
  res.status(201).json({ data: item });
});

/** DELETE /wishlist/:productId */
wishlistRouter.delete('/:productId', async (req, res) => {
  const userId = currentUser(req).id;
  await prisma.wishlistItem.deleteMany({ where: { userId, productId: req.params.productId } });
  res.json({ data: { removed: true } });
});
