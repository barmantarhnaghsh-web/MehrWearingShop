import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/http-error';
import { normalizePagination, pageMeta, pageSkip } from '../../lib/pagination';
import { currentUser, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

export const reviewsRouter = Router();

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(5).max(2000),
});

/** Recompute the denormalized rating columns on the product row. */
async function refreshProductRating(productId: string) {
  const agg = await prisma.review.aggregate({
    where: { productId, isApproved: true },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await prisma.product.update({
    where: { id: productId },
    data: { ratingAvg: Number((agg._avg.rating ?? 0).toFixed(1)), ratingCount: agg._count.rating },
  });
}

/** GET /products/:slug/reviews — approved reviews with pagination. */
export const productReviewsRouter = Router({ mergeParams: true });

productReviewsRouter.get('/', async (req, res) => {
  const slug = String((req.params as { slug?: string }).slug ?? '');
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product) throw ApiError.notFound('Product not found');
  const pagination = normalizePagination(req.query.page as string, req.query.limit as string);

  const where = { productId: product.id, isApproved: true };
  const [total, reviews] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      skip: pageSkip(pagination),
      take: pagination.limit,
    }),
  ]);

  res.json({
    data: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      author: `${r.user.firstName} ${r.user.lastName.charAt(0)}.`,
      createdAt: r.createdAt,
    })),
    meta: pageMeta(pagination, total),
  });
});

/** POST /products/:slug/reviews — one review per user per product. */
productReviewsRouter.post('/', requireAuth, validate({ body: reviewSchema }), async (req, res) => {
  const user = currentUser(req);
  const slug = String((req.params as { slug?: string }).slug ?? '');
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product) throw ApiError.notFound('Product not found');

  const existing = await prisma.review.findUnique({
    where: { productId_userId: { productId: product.id, userId: user.id } },
  });
  if (existing) throw ApiError.conflict('You have already reviewed this product');

  const review = await prisma.review.create({
    data: { productId: product.id, userId: user.id, ...req.body },
  });
  await refreshProductRating(product.id);
  res.status(201).json({ data: review });
});

/**
 * GET /reviews — the authenticated user's own reviews (with their product),
 * so account/mobile UIs can find the ids needed to edit or delete them.
 */
reviewsRouter.get('/', requireAuth, async (req, res) => {
  const user = currentUser(req);
  const pagination = normalizePagination(req.query.page as string, req.query.limit as string);
  const where = { userId: user.id };
  const [total, reviews] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      include: { product: { select: { slug: true, nameFa: true, nameEn: true, images: true } } },
      orderBy: { createdAt: 'desc' },
      skip: pageSkip(pagination),
      take: pagination.limit,
    }),
  ]);
  res.json({
    data: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      isApproved: r.isApproved,
      product: r.product,
      createdAt: r.createdAt,
    })),
    meta: pageMeta(pagination, total),
  });
});

/** DELETE /reviews/:id — remove your own review. */
reviewsRouter.delete('/:id', requireAuth, async (req, res) => {
  const user = currentUser(req);
  const review = await prisma.review.findFirst({ where: { id: req.params.id, userId: user.id } });
  if (!review) throw ApiError.notFound('Review not found');
  await prisma.review.delete({ where: { id: review.id } });
  await refreshProductRating(review.productId);
  res.json({ data: { deleted: true } });
});
