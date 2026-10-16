import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { brandPublic, productPublic } from '../../lib/catalog.mapper';
import { ApiError } from '../../lib/http-error';

export const brandsRouter = Router();

/** GET /brands — every brand with product counts. */
brandsRouter.get('/', async (_req, res) => {
  const brands = await prisma.brand.findMany({
    orderBy: { nameEn: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  res.json({
    data: brands.map((b) => ({ ...brandPublic(b), productCount: b._count.products })),
  });
});

/** GET /brands/:slug — brand detail + products. */
brandsRouter.get('/:slug', async (req, res) => {
  const brand = await prisma.brand.findUnique({
    where: { slug: req.params.slug },
    include: {
      products: {
        where: { status: 'ACTIVE' },
        include: { category: true, brand: true, variants: { where: { isActive: true } } },
        orderBy: { createdAt: 'desc' },
        take: 24,
      },
    },
  });
  if (!brand) throw ApiError.notFound('Brand not found');
  res.json({
    data: { ...brandPublic(brand), products: brand.products.map(productPublic) },
  });
});
