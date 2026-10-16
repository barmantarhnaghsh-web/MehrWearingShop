import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/http-error';
import { evaluateCoupon } from '../../lib/money';

export interface CartContext {
  userId?: string;
  guestId?: string; // x-cart-id header
}

const cartInclude = {
  items: {
    include: {
      variant: {
        include: { product: { include: { category: true, brand: true } } },
      },
    },
  },
  coupon: true,
} satisfies Prisma.CartInclude;

export type CartDetailed = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

export interface CartTotals {
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  couponCode: string | null;
  couponReason?: 'COUPON_NOT_FOUND' | 'NOT_ACTIVE' | 'NOT_STARTED' | 'EXPIRED' | 'USAGE_LIMIT' | 'MIN_AMOUNT';
}

export const FREE_SHIPPING_THRESHOLD = 500_000; // Toman
export const DEFAULT_SHIPPING_COST = 35_000; // Toman

/** Resolve (or lazily create) the caller's cart. Users win over guests. */
export async function resolveCart(ctx: CartContext): Promise<CartDetailed> {
  if (ctx.userId) {
    const existing = await prisma.cart.findUnique({ where: { userId: ctx.userId }, include: cartInclude });
    if (existing) return existing;
    return prisma.cart.create({ data: { userId: ctx.userId }, include: cartInclude });
  }
  if (ctx.guestId) {
    const existing = await prisma.cart.findUnique({ where: { guestId: ctx.guestId }, include: cartInclude });
    if (existing) return existing;
    return prisma.cart.create({ data: { guestId: ctx.guestId }, include: cartInclude });
  }
  throw ApiError.badRequest('Provide a logged-in session or an x-cart-id header for guest carts');
}

/** Structural shape needed to compute totals (works for cart or checkout reads). */
export interface TotalsInput {
  couponCode: string | null;
  coupon?: {
    type: 'PERCENT' | 'FIXED';
    value: number;
    minOrderAmount: number | null;
    maxDiscount: number | null;
    isActive: boolean;
    startsAt: Date;
    expiresAt: Date | null;
    usageLimit?: number | null;
    usedCount?: number | null;
  } | null;
  items: Array<{
    quantity: number;
    variant: { price: number | null; product: { basePrice: number } };
  }>;
}

/** Totals — pure computation shared by cart preview and checkout. */
export function computeTotals(cart: TotalsInput, now = new Date()): CartTotals {
  const subtotal = cart.items.reduce(
    (sum, item) => sum + (item.variant.price ?? item.variant.product.basePrice) * item.quantity,
    0,
  );

  let discount = 0;
  let couponReason: CartTotals['couponReason'];
  if (cart.couponCode) {
    const coupon = cart.coupon;
    if (!coupon) couponReason = 'COUPON_NOT_FOUND';
    else if (coupon.usageLimit != null && (coupon.usedCount ?? 0) >= coupon.usageLimit)
      couponReason = 'USAGE_LIMIT';
    else {
      const result = evaluateCoupon(coupon, subtotal, now);
      if (result.valid) discount = result.discount;
      else couponReason = result.reason as CartTotals['couponReason'];
    }
  }

  const afterDiscount = subtotal - discount;
  const shippingCost =
    afterDiscount === 0 || afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_COST;

  return {
    subtotal,
    discount,
    shippingCost,
    total: afterDiscount + shippingCost,
    couponCode: discount > 0 ? cart.couponCode : null,
    ...(couponReason ? { couponReason } : {}),
  };
}

export function cartResponse(cart: CartDetailed) {
  return {
    id: cart.id,
    guestId: cart.guestId,
    couponCode: cart.couponCode,
    items: cart.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      variantId: item.variantId,
      sku: item.variant.sku,
      unitPrice: item.variant.price ?? item.variant.product.basePrice,
      lineTotal: (item.variant.price ?? item.variant.product.basePrice) * item.quantity,
      stock: item.variant.stock,
      variant: {
        id: item.variant.id,
        nameFa: item.variant.nameFa,
        nameEn: item.variant.nameEn,
        attributes: item.variant.attributes ?? null,
      },
      product: {
        id: item.variant.product.id,
        slug: item.variant.product.slug,
        nameFa: item.variant.product.nameFa,
        nameEn: item.variant.product.nameEn,
        image: item.variant.product.images[0] ?? null,
        category: item.variant.product.category?.nameFa ?? null,
      },
    })),
    totals: computeTotals(cart),
  };
}

/** Add/update quantity for a variant (upsert semantics). */
export async function setItemQuantity(ctx: CartContext, variantId: string, quantity: number) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });
  if (!variant || !variant.isActive || variant.product.status !== 'ACTIVE') {
    throw ApiError.notFound('Selected product variant is not available');
  }
  if (quantity > variant.stock) {
    throw ApiError.unprocessable(`Only ${variant.stock} items left in stock`, { field: 'quantity' });
  }

  const cart = await resolveCart(ctx);
  if (quantity <= 0) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id, variantId } });
  } else {
    await prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      create: { cartId: cart.id, variantId, quantity },
      update: { quantity },
    });
  }
  return cartResponse(await resolveCart(ctx));
}

export async function clearCart(cartId: string) {
  await prisma.cartItem.deleteMany({ where: { cartId } });
  await prisma.cart.update({ where: { id: cartId }, data: { couponCode: null } });
}

export async function applyCoupon(ctx: CartContext, code: string | null) {
  const cart = await resolveCart(ctx);
  if (code) {
    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon || !coupon.isActive) throw ApiError.notFound('Coupon not found');
    await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: coupon.code } });
  } else {
    await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
  }
  const detailed = await prisma.cart.findUnique({ where: { id: cart.id }, include: cartInclude });
  return cartResponse(detailed!);
}
