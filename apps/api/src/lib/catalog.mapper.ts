import { Brand, Category, Product, ProductVariant } from '@prisma/client';

/**
 * Serializers shared by catalog/cart/order endpoints.
 * Money fields are plain integers (Toman); clients format per locale.
 */

export type ProductWithRelations = Product & {
  category?: Category | null;
  brand?: Brand | null;
  variants?: ProductVariant[];
};

export function variantPublic(v: ProductVariant) {
  return {
    id: v.id,
    sku: v.sku,
    nameFa: v.nameFa,
    nameEn: v.nameEn,
    price: v.price,
    stock: v.stock,
    attributes: v.attributes ?? null,
    isActive: v.isActive,
  };
}

export function categoryPublic(c: Category) {
  return {
    id: c.id,
    slug: c.slug,
    nameFa: c.nameFa,
    nameEn: c.nameEn,
    parentId: c.parentId,
    icon: c.icon,
    imageUrl: c.imageUrl,
    order: c.order,
  };
}

export function brandPublic(b: Brand) {
  return { id: b.id, slug: b.slug, nameFa: b.nameFa, nameEn: b.nameEn, logoUrl: b.logoUrl };
}

export function productPublic(p: ProductWithRelations) {
  const activeVariants = (p.variants ?? []).filter((v) => v.isActive);
  const prices = activeVariants.map((v) => v.price ?? p.basePrice);
  return {
    id: p.id,
    slug: p.slug,
    nameFa: p.nameFa,
    nameEn: p.nameEn,
    descriptionFa: p.descriptionFa,
    descriptionEn: p.descriptionEn,
    status: p.status,
    images: p.images,
    attributes: p.attributes ?? null,
    basePrice: p.basePrice,
    minPrice: prices.length ? Math.min(...prices) : p.basePrice,
    stock: activeVariants.reduce((sum, v) => sum + v.stock, 0),
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    soldCount: p.soldCount,
    isFeatured: p.isFeatured,
    isNew: p.isNew,
    category: p.category ? categoryPublic(p.category) : null,
    brand: p.brand ? brandPublic(p.brand) : null,
    variants: activeVariants.map(variantPublic),
    createdAt: p.createdAt,
  };
}
