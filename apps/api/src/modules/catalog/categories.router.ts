import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/http-error';
import { categoryPublic, productPublic } from '../../lib/catalog.mapper';
import { normalizePagination, pageMeta, pageSkip } from '../../lib/pagination';

export const categoriesRouter = Router();

/** Build a nested tree from a flat category list. */
export function buildTree<T extends { id: string; parentId: string | null }>(rows: T[]): Array<T & { children: T[] }> {
  const map = new Map<string, T & { children: T[] }>();
  rows.forEach((r) => map.set(r.id, { ...r, children: [] }));
  const roots: Array<T & { children: T[] }> = [];
  map.forEach((node) => {
    if (node.parentId) map.get(node.parentId)?.children.push(node);
    else roots.push(node);
  });
  return roots;
}

/** GET /categories — full navigation tree. */
categoriesRouter.get('/', async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  const tree = buildTree(categories).map((c) => ({
    ...categoryPublic(c),
    productCount: c._count.products,
    children: c.children.map((child) => ({
      ...categoryPublic(child),
      productCount: (child as unknown as { _count: { products: number } })._count.products,
      children: [],
    })),
  }));
  res.json({ data: tree });
});

/** GET /categories/:slug — category detail + paginated products. */
categoriesRouter.get('/:slug', async (req, res) => {
  const category = await prisma.category.findUnique({ where: { slug: req.params.slug } });
  if (!category) throw ApiError.notFound('Category not found');
  const pagination = normalizePagination(req.query.page as string, req.query.limit as string);

  // Include descendant categories so sub-category pages show the whole branch.
  const all = await prisma.category.findMany();
  const subtreeIds = collectSubtreeIds(all, category.id);

  const [total, products] = await Promise.all([
    prisma.product.count({ where: { categoryId: { in: subtreeIds }, status: 'ACTIVE' } }),
    prisma.product.findMany({
      where: { categoryId: { in: subtreeIds }, status: 'ACTIVE' },
      include: { category: true, brand: true, variants: { where: { isActive: true } } },
      orderBy: { createdAt: 'desc' },
      skip: pageSkip(pagination),
      take: pagination.limit,
    }),
  ]);

  res.json({
    data: {
      ...categoryPublic(category),
      products: products.map(productPublic),
      meta: pageMeta(pagination, total),
    },
  });
});

export function collectSubtreeIds(
  all: Array<{ id: string; parentId: string | null }>,
  rootId: string,
): string[] {
  const ids = [rootId];
  let frontier = [rootId];
  while (frontier.length) {
    const children = all.filter((c) => c.parentId && frontier.includes(c.parentId)).map((c) => c.id);
    ids.push(...children);
    frontier = children;
  }
  return ids;
}
