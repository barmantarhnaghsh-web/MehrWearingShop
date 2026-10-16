import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/http-error';
import { requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { normalizePagination, pageMeta, pageSkip } from '../../lib/pagination';
import { slugify } from '../../lib/slug';
import { brandPublic, categoryPublic, productPublic } from '../../lib/catalog.mapper';
import { orderPublic, orderInclude, restockOrder } from '../orders/orders.service';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

adminRouter.get('/stats', async (_req, res) => {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [users, products, orders, revenue, pending, lowStock, recentOrders, topProducts] = await Promise.all([
    prisma.user.count(),
    prisma.product.count({ where: { status: 'ACTIVE' } }),
    prisma.order.count(),
    prisma.order.aggregate({ where: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } }, _sum: { total: true } }),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.productVariant.count({ where: { stock: { lte: 3 }, isActive: true } }),
    prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: orderInclude }),
    prisma.product.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { soldCount: 'desc' },
      take: 5,
      include: { category: true, brand: true, variants: { where: { isActive: true } } },
    }),
  ]);
  const ordersToday = await prisma.order.count({ where: { createdAt: { gte: dayAgo } } });

  res.json({
    data: {
      users,
      products,
      orders,
      ordersToday,
      revenue: revenue._sum.total ?? 0,
      pendingOrders: pending,
      lowStockVariants: lowStock,
      recentOrders: recentOrders.map(orderPublic),
      topProducts: topProducts.map(productPublic),
    },
  });
});

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

const variantSchema = z.object({
  sku: z.string().min(2).max(40),
  nameFa: z.string().max(80).optional().nullable(),
  nameEn: z.string().max(80).optional().nullable(),
  price: z.number().int().nonnegative().nullable().optional(),
  stock: z.number().int().min(0).default(0),
  attributes: z.record(z.union([z.string(), z.number()])).optional().nullable(),
  isActive: z.boolean().optional(),
});

/**
 * Image references accept either an absolute http(s) URL or a root-relative
 * path (e.g. `/images/products/shirt.svg`) served by the web app, so products
 * seeded with local SVG art remain editable through the admin API.
 */
const imageRef = z
  .string()
  .refine((s) => /^https?:\/\/\S+/.test(s) || s.startsWith('/'), {
    message: 'must be an absolute http(s) URL or a root-relative path like /images/x.svg',
  });

const productSchema = z.object({
  nameFa: z.string().min(2).max(160),
  nameEn: z.string().min(2).max(160),
  descriptionFa: z.string().max(5000).optional().nullable(),
  descriptionEn: z.string().max(5000).optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
  images: z.array(imageRef).max(10).default([]),
  attributes: z.record(z.union([z.string(), z.number()])).optional().nullable(),
  basePrice: z.number().int().nonnegative(),
  isFeatured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  categoryId: z.string().min(1),
  brandId: z.string().min(1).nullable().optional(),
  slug: z.string().optional(),
  variants: z.array(variantSchema).min(1),
});

const productInclude = { category: true, brand: true, variants: true } satisfies Prisma.ProductInclude;

adminRouter.get('/products', async (req, res) => {
  const pagination = normalizePagination(req.query.page as string, req.query.limit as '20');
  pagination.limit = Math.min(50, pagination.limit);
  const where: Prisma.ProductWhereInput = {};
  const q = String(req.query.q ?? '').trim();
  if (q) {
    where.OR = [
      { nameFa: { contains: q, mode: 'insensitive' } },
      { nameEn: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (req.query.status) where.status = req.query.status as never;

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { createdAt: 'desc' },
      skip: pageSkip(pagination),
      take: pagination.limit,
    }),
  ]);
  res.json({ data: products.map(productPublic), meta: pageMeta(pagination, total) });
});

adminRouter.post('/products', validate({ body: productSchema }), async (req, res) => {
  const body = req.body as z.infer<typeof productSchema>;
  const slug = body.slug ? slugify(body.slug) : slugify(body.nameEn);
  const product = await prisma.product.create({
    data: {
      slug,
      nameFa: body.nameFa,
      nameEn: body.nameEn,
      descriptionFa: body.descriptionFa ?? null,
      descriptionEn: body.descriptionEn ?? null,
      status: body.status,
      images: body.images,
      attributes: body.attributes ?? undefined,
      basePrice: body.basePrice,
      isFeatured: body.isFeatured ?? false,
      isNew: body.isNew ?? true,
      categoryId: body.categoryId,
      brandId: body.brandId ?? null,
      variants: {
        create: body.variants.map((v) => ({
          sku: v.sku,
          nameFa: v.nameFa ?? null,
          nameEn: v.nameEn ?? null,
          price: v.price ?? null,
          stock: v.stock,
          attributes: v.attributes ?? undefined,
          isActive: v.isActive ?? true,
        })),
      },
    },
    include: productInclude,
  });
  res.status(201).json({ data: productPublic(product) });
});

adminRouter.get('/products/:id', async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id }, include: productInclude });
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ data: productPublic(product) });
});

adminRouter.patch('/products/:id', validate({ body: productSchema.partial().omit({ variants: true }) }), async (req, res) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Product not found');
  const body = req.body as Record<string, unknown>;
  const product = await prisma.product.update({
    where: { id: existing.id },
    data: {
      ...body,
      attributes: body.attributes ?? undefined,
      slug: body.slug ? slugify(String(body.slug)) : undefined,
    },
    include: productInclude,
  });
  res.json({ data: productPublic(product) });
});

adminRouter.delete('/products/:id', async (req, res) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Product not found');
  // Soft-delete by archiving so historic orders keep their foreign keys.
  await prisma.product.update({ where: { id: existing.id }, data: { status: 'ARCHIVED' } });
  res.json({ data: { archived: true } });
});

adminRouter.post('/products/:id/variants', validate({ body: variantSchema }), async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) throw ApiError.notFound('Product not found');
  const variant = await prisma.productVariant.create({
    data: { ...req.body, productId: product.id, attributes: req.body.attributes ?? undefined },
  });
  res.status(201).json({ data: variant });
});

adminRouter.patch('/variants/:id', validate({ body: variantSchema.partial() }), async (req, res) => {
  const variant = await prisma.productVariant.findUnique({ where: { id: req.params.id } });
  if (!variant) throw ApiError.notFound('Variant not found');
  const updated = await prisma.productVariant.update({
    where: { id: variant.id },
    data: { ...req.body, attributes: req.body.attributes ?? undefined },
  });
  res.json({ data: updated });
});

// ---------------------------------------------------------------------------
// Categories & brands
// ---------------------------------------------------------------------------

const categorySchema = z.object({
  nameFa: z.string().min(1).max(80),
  nameEn: z.string().min(1).max(80),
  slug: z.string().optional(),
  parentId: z.string().nullable().optional(),
  icon: z.string().max(40).optional().nullable(),
  imageUrl: imageRef.nullable().optional(),
  order: z.number().int().optional(),
});

adminRouter.get('/categories', async (_req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { order: 'asc' } });
  res.json({ data: categories.map(categoryPublic) });
});

adminRouter.post('/categories', validate({ body: categorySchema }), async (req, res) => {
  const category = await prisma.category.create({
    data: {
      slug: req.body.slug ? slugify(req.body.slug) : slugify(req.body.nameEn),
      nameFa: req.body.nameFa,
      nameEn: req.body.nameEn,
      parentId: req.body.parentId ?? null,
      icon: req.body.icon ?? null,
      imageUrl: req.body.imageUrl ?? null,
      order: req.body.order ?? 0,
    },
  });
  res.status(201).json({ data: categoryPublic(category) });
});

adminRouter.patch('/categories/:id', validate({ body: categorySchema.partial() }), async (req, res) => {
  const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Category not found');
  const category = await prisma.category.update({ where: { id: existing.id }, data: req.body });
  res.json({ data: categoryPublic(category) });
});

adminRouter.delete('/categories/:id', async (req, res) => {
  const count = await prisma.product.count({ where: { categoryId: req.params.id } });
  if (count > 0) throw ApiError.unprocessable('Move or delete products in this category first');
  await prisma.category.delete({ where: { id: req.params.id } }).catch(() => {
    throw ApiError.notFound('Category not found');
  });
  res.json({ data: { deleted: true } });
});

const brandSchema = z.object({
  nameFa: z.string().min(1).max(80),
  nameEn: z.string().min(1).max(80),
  slug: z.string().optional(),
  logoUrl: imageRef.nullable().optional(),
});

adminRouter.get('/brands', async (_req, res) => {
  const brands = await prisma.brand.findMany({ orderBy: { nameEn: 'asc' } });
  res.json({ data: brands.map(brandPublic) });
});

adminRouter.post('/brands', validate({ body: brandSchema }), async (req, res) => {
  const brand = await prisma.brand.create({
    data: {
      slug: req.body.slug ? slugify(req.body.slug) : slugify(req.body.nameEn),
      nameFa: req.body.nameFa,
      nameEn: req.body.nameEn,
      logoUrl: req.body.logoUrl ?? null,
    },
  });
  res.status(201).json({ data: brandPublic(brand) });
});

// ---------------------------------------------------------------------------
// Orders (admin view & status workflow)
// ---------------------------------------------------------------------------

adminRouter.get('/orders', async (req, res) => {
  const pagination = normalizePagination(req.query.page as string, req.query.limit as '20');
  pagination.limit = Math.min(50, pagination.limit);
  const where: Prisma.OrderWhereInput = {};
  if (req.query.status) where.status = req.query.status as never;
  const q = String(req.query.q ?? '').trim();
  if (q) where.orderNumber = { contains: q, mode: 'insensitive' };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: { ...orderInclude, user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: pageSkip(pagination),
      take: pagination.limit,
    }),
  ]);
  res.json({
    data: orders.map((o) => ({
      ...orderPublic(o),
      customer: `${o.user.firstName} ${o.user.lastName}`,
      email: o.user.email,
    })),
    meta: pageMeta(pagination, total),
  });
});

const statusSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});

adminRouter.patch('/orders/:id/status', validate({ body: statusSchema }), async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) throw ApiError.notFound('Order not found');

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.order.update({
      where: { id: order.id },
      data: { status: req.body.status },
      include: orderInclude,
    });

    if (req.body.status === 'CANCELLED' && order.status !== 'CANCELLED') {
      await restockOrder(tx, order.id);
      if (next.payment) {
        await tx.payment.update({ where: { id: next.payment.id }, data: { status: 'REFUNDED' } });
      }
    }
    if (req.body.status === 'DELIVERED' && order.status !== 'DELIVERED') {
      await tx.product.updateMany({
        where: { id: { in: (await tx.orderItem.findMany({ where: { orderId: order.id } })).map((i) => i.productId) } },
        data: { soldCount: { increment: 1 } },
      });
    }
    return next;
  });

  res.json({ data: orderPublic(updated) });
});

// ---------------------------------------------------------------------------
// Users (admin view)
// ---------------------------------------------------------------------------

adminRouter.get('/users', async (req, res) => {
  const pagination = normalizePagination(req.query.page as string, req.query.limit as '20');
  pagination.limit = Math.min(50, pagination.limit);
  const [total, users] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: pageSkip(pagination),
      take: pagination.limit,
    }),
  ]);
  res.json({
    data: users.map((u) => ({ ...u, orderCount: u._count.orders, _count: undefined })),
    meta: pageMeta(pagination, total),
  });
});
