import { PaymentGateway, Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/http-error';
import { orderNumber } from '../../lib/slug';
import { computeTotals } from '../cart/cart.service';

export interface CheckoutAddress {
  fullName: string;
  phone: string;
  province: string;
  city: string;
  postalCode: string;
  addressLine: string;
}

export interface CheckoutInput {
  userId: string;
  address: CheckoutAddress;
  note?: string;
  gateway?: 'mock' | 'zarinpal' | 'cod';
}

export const orderInclude = {
  items: true,
  payment: true,
  coupon: true,
} satisfies Prisma.OrderInclude;

export type OrderDetailed = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export function orderPublic(order: OrderDetailed) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    subtotal: order.subtotal,
    discount: order.discount,
    shippingCost: order.shippingCost,
    total: order.total,
    couponCode: order.couponCode,
    address: order.address,
    note: order.note,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    payment: order.payment
      ? {
          gateway: order.payment.gateway,
          status: order.payment.status,
          amount: order.payment.amount,
          refId: order.payment.refId,
          paidAt: order.payment.paidAt,
        }
      : null,
    items: order.items.map((item) => ({
      id: item.id,
      titleFa: item.titleFa,
      titleEn: item.titleEn,
      sku: item.sku,
      variantNameFa: item.variantNameFa,
      variantNameEn: item.variantNameEn,
      imageUrl: item.imageUrl,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      total: item.total,
    })),
  };
}

/**
 * Convert the user's cart into an order inside one transaction:
 *  - validates stock and reserves it (decrement)
 *  - snapshots product titles/prices so later catalog edits never mutate orders
 *  - increments coupon usage
 *  - creates a PENDING payment and clears the cart
 */
export async function checkout(input: CheckoutInput) {
  const cart = await prisma.cart.findUnique({
    where: { userId: input.userId },
    include: {
      coupon: true,
      items: { include: { variant: { include: { product: true } } } },
    },
  });
  if (!cart || cart.items.length === 0) throw ApiError.unprocessable('Your cart is empty');

  const totals = computeTotals(cart);
  if (cart.couponCode && totals.discount === 0) {
    throw ApiError.unprocessable('Coupon is not applicable to this order', {
      couponReason: totals.couponReason,
    });
  }

  const requestedGateway: PaymentGateway =
    input.gateway === 'cod' ? 'COD' : input.gateway === 'zarinpal' ? 'ZARINPAL' : env.PAYMENT_PROVIDER === 'zarinpal' ? 'ZARINPAL' : env.PAYMENT_PROVIDER === 'cod' ? 'COD' : 'MOCK';

  const order = await prisma.$transaction(async (tx) => {
    // Reserve stock atomically; each update re-checks availability.
    for (const item of cart.items) {
      const updated = await tx.productVariant.updateMany({
        where: { id: item.variantId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count === 0) {
        throw ApiError.unprocessable(`Not enough stock for "${item.variant.product.nameFa}"`, {
          variantId: item.variantId,
        });
      }
    }

    const created = await tx.order.create({
      data: {
        orderNumber: orderNumber(),
        userId: input.userId,
        subtotal: totals.subtotal,
        discount: totals.discount,
        shippingCost: totals.shippingCost,
        total: totals.total,
        couponCode: totals.discount > 0 ? cart.couponCode : null,
        address: input.address as unknown as Prisma.InputJsonValue,
        note: input.note,
        items: {
          create: cart.items.map((item) => ({
            productId: item.variant.product.id,
            variantId: item.variant.id,
            titleFa: item.variant.product.nameFa,
            titleEn: item.variant.product.nameEn,
            sku: item.variant.sku,
            variantNameFa: item.variant.nameFa,
            variantNameEn: item.variant.nameEn,
            imageUrl: item.variant.product.images[0] ?? null,
            unitPrice: item.variant.price ?? item.variant.product.basePrice,
            quantity: item.quantity,
            total: (item.variant.price ?? item.variant.product.basePrice) * item.quantity,
          })),
        },
        payment: {
          create: { gateway: requestedGateway, amount: totals.total },
        },
      },
      include: orderInclude,
    });

    if (totals.discount > 0 && cart.couponCode) {
      await tx.coupon.update({
        where: { code: cart.couponCode },
        data: { usedCount: { increment: 1 } },
      });
    }

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });

    return created;
  });

  return order;
}

/** Where the customer should be sent to complete/verify payment. */
export function paymentUrlFor(order: OrderDetailed): string | null {
  if (!order.payment) return null;
  switch (order.payment.gateway) {
    case 'MOCK':
      // Path-only: the browser resolves it against whichever origin it is
      // browsing (web proxy, single-domain nginx, localhost:3000 →4000 …).
      return `/api/v1/payments/mock/${order.payment.id}`;
    case 'ZARINPAL':
      return order.payment.authority
        ? `https://www.zarinpal.com/pg/StartPay/${order.payment.authority}`
        : null;
    case 'COD':
      return null; // pay on delivery
    default:
      return null;
  }
}

/** Restore stock when an order is cancelled. */
export async function restockOrder(tx: Prisma.TransactionClient, orderId: string) {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const item of items) {
    await tx.productVariant.update({
      where: { id: item.variantId },
      data: { stock: { increment: item.quantity } },
    });
  }
}

export async function listUserOrders(userId: string, page: number, limit: number) {
  const where = { userId };
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return { total, orders };
}

export async function getUserOrder(userId: string, idOrNumber: string) {
  const order = await prisma.order.findFirst({
    where: { userId, OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }] },
    include: orderInclude,
  });
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

/** Public lookup used by the order-success page (returns minimal info). */
export async function getOrderByNumber(orderNumberStr: string) {
  const order = await prisma.order.findUnique({
    where: { orderNumber: orderNumberStr },
    include: { items: true, payment: true },
  });
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}
