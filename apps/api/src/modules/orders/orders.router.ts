import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/http-error';
import { currentUser, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { normalizePagination, pageMeta } from '../../lib/pagination';
import * as ordersService from './orders.service';
import { createZarinpalPayment } from '../payments/zarinpal';

export const ordersRouter = Router();
// NOTE: guard each route individually — this router is mounted at the API root,
// so router-level auth would block later public routes (payments, coupons…).

const addressSchema = z.object({
  fullName: z.string().min(3).max(80),
  phone: z.string().regex(/^09\d{9}$/),
  province: z.string().min(1).max(60),
  city: z.string().min(1).max(60),
  postalCode: z.string().regex(/^\d{10}$/),
  addressLine: z.string().min(5).max(300),
});

const checkoutSchema = z.object({
  address: addressSchema,
  addressId: z.string().optional(), // convenience: reuse a saved address
  note: z.string().max(500).optional(),
  gateway: z.enum(['mock', 'zarinpal', 'cod']).optional(),
});

/** POST /checkout/orders — turn the cart into an order. */
ordersRouter.post('/checkout/orders', requireAuth, validate({ body: checkoutSchema }), async (req, res) => {
  const user = currentUser(req);
  let address = req.body.address as z.infer<typeof addressSchema> | undefined;

  if (req.body.addressId) {
    const saved = await prisma.address.findFirst({
      where: { id: req.body.addressId, userId: user.id },
    });
    if (!saved) throw ApiError.notFound('Saved address not found');
    address = {
      fullName: saved.fullName,
      phone: saved.phone,
      province: saved.province,
      city: saved.city,
      postalCode: saved.postalCode,
      addressLine: saved.addressLine,
    };
  }
  if (!address) throw ApiError.badRequest('Shipping address is required');

  const order = await ordersService.checkout({
    userId: user.id,
    address,
    note: req.body.note,
    gateway: req.body.gateway,
  });

  // ZarinPal needs an authority before redirecting the customer.
  if (order.payment?.gateway === 'ZARINPAL' && !order.payment.authority) {
    const authority = await createZarinpalPayment(order.total, `${order.orderNumber}`, {
      email: user.id,
      mobile: address.phone,
    });
    await prisma.payment.update({ where: { id: order.payment.id }, data: { authority } });
    order.payment.authority = authority;
  }

  res.status(201).json({
    data: {
      ...ordersService.orderPublic(order),
      paymentUrl: ordersService.paymentUrlFor(order),
    },
  });
});

/** GET /orders — my orders. */
ordersRouter.get('/orders', requireAuth, async (req, res) => {
  const user = currentUser(req);
  const pagination = normalizePagination(req.query.page as string, req.query.limit as string);
  const { total, orders } = await ordersService.listUserOrders(user.id, pagination.page, pagination.limit);
  res.json({
    data: orders.map(ordersService.orderPublic),
    meta: pageMeta(pagination, total),
  });
});

/** GET /orders/:id — one of my orders (id or order number). */
ordersRouter.get('/orders/:id', requireAuth, async (req, res) => {
  const order = await ordersService.getUserOrder(currentUser(req).id, req.params.id);
  res.json({ data: ordersService.orderPublic(order) });
});

/** POST /orders/:id/cancel — customer cancels a PENDING order (stock returns). */
ordersRouter.post('/orders/:id/cancel', requireAuth, async (req, res) => {
  const user = currentUser(req);
  const order = await ordersService.getUserOrder(user.id, req.params.id);
  if (order.status !== 'PENDING') throw ApiError.unprocessable('Only pending orders can be cancelled');

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' },
      include: ordersService.orderInclude,
    });
    await ordersService.restockOrder(tx, order.id);
    if (next.payment) {
      await tx.payment.update({ where: { id: next.payment.id }, data: { status: 'FAILED' } });
    }
    return next;
  });
  res.json({ data: ordersService.orderPublic(updated) });
});

/** GET /orders/public/:orderNumber — minimal public info for the thank-you page. */
export const publicOrdersRouter = Router();
publicOrdersRouter.get('/orders/public/:orderNumber', async (req, res) => {
  const order = await ordersService.getOrderByNumber(req.params.orderNumber);
  res.json({
    data: {
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
      itemCount: order.items.reduce((s, i) => s + i.quantity, 0),
      paymentStatus: order.payment?.status ?? null,
      createdAt: order.createdAt,
    },
  });
});
