import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/http-error';
import { normalizePagination, pageMeta, pageSkip } from '../../lib/pagination';
import { optionalAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { productPublic } from '../../lib/catalog.mapper';
import { z } from 'zod';

export const productsRouter = Router();

const listQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().optional(), // slug
  brand: z.string().optional(), // slug
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'bestselling', 'rating']).default('newest'),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const productInclude = {
  category: true,
  brand: true,
  variants: { where: { isActive: true } },
} satisfies Prisma.ProductInclude;

/**
 * GET /products — public catalog with search, filters, sort and pagination.
 */
productsRouter.get('/', validate({ query: listQuerySchema }), async (req, res) => {
  const { q, category, brand, minPrice, maxPrice, minRating, sort } = req.query as unknown as {
    q?: string;
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    sort: 'newest' | 'price-asc' | 'price-desc' | 'bestselling' | 'rating';
  };
  const pagination = normalizePagination(req.query.page as string, req.query.limit as string);

  const where: Prisma.ProductWhereInput = { status: 'ACTIVE' };
  if (q) {
    // ILIKE keeps Persian text searchable without extra extensions.
    where.OR = [
      { nameFa: { contains: q, mode: 'insensitive' } },
      { nameEn: { contains: q, mode: 'insensitive' } },
      { descriptionFa: { contains: q, mode: 'insensitive' } },
      { descriptionEn: { contains: q, mode: 'insensitive' } },
      { brand: { nameFa: { contains: q, mode: 'insensitive' } } },
    ];
  }
  if (category) where.category = { slug: category };
  if (brand) where.brand = { slug: brand };
  if (minRating) where.ratingAvg = { gte: minRating };
  if (minPrice != null || maxPrice != null) {
    where.basePrice = { gte: minPrice, lte: maxPrice };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === 'price-asc'
      ? { basePrice: 'asc' }
      : sort === 'price-desc'
        ? { basePrice: 'desc' }
        : sort === 'bestselling'
          ? { soldCount: 'desc' }
          : sort === 'rating'
            ? { ratingAvg: 'desc' }
            : { createdAt: 'desc' };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy,
      skip: pageSkip(pagination),
      take: pagination.limit,
    }),
  ]);

  res.json({
    data: products.map(productPublic),
    meta: pageMeta(pagination, total),
  });
});

/**
 * GET /products/:slug — full product detail including variants.
 */
productsRouter.get('/:slug', optionalAuth, async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { slug: req.params.slug, status: 'ACTIVE' },
    include: productInclude,
  });
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ data: productPublic(product) });
});

/**
 * GET /products/:slug/related — same category, excluding itself.
 */
productsRouter.get('/:slug/related', async (req, res) => {
  const product = await prisma.product.findUnique({ where: { slug: req.params.slug } });
  if (!product) throw ApiError.notFound('Product not found');

  const related = await prisma.product.findMany({
    where: { categoryId: product.categoryId, status: 'ACTIVE', id: { not: product.id } },
    include: productInclude,
    orderBy: { ratingAvg: 'desc' },
    take: 8,
  });
  res.json({ data: related.map(productPublic) });
});

/**
 * GET /search/suggest — lightweight autocomplete for the header search box.
 */
export const suggestRouter = Router();
suggestRouter.get('/', async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (q.length < 2) return res.json({ data: [] });
  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { nameFa: { contains: q, mode: 'insensitive' } },
        { nameEn: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { slug: true, nameFa: true, nameEn: true, basePrice: true, images: true },
    orderBy: { soldCount: 'desc' },
    take: 6,
  });
  return res.json({ data: products });
});
