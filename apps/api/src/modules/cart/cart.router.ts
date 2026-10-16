import { Router } from 'express';
import { z } from 'zod';
import { optionalAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as cartService from './cart.service';

export const cartRouter = Router();
cartRouter.use(optionalAuth);

const ctxOf = (req: Parameters<typeof optionalAuth>[0]) => ({
  userId: req.user?.id,
  guestId: typeof req.headers['x-cart-id'] === 'string' ? req.headers['x-cart-id'] : undefined,
});

const itemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(99).default(1),
});

const updateItemSchema = z.object({
  quantity: z.number().int().min(0).max(99),
});

const couponSchema = z.object({
  code: z.string().trim().min(3).max(24).nullable(),
});

/** GET /cart — current cart + computed totals (guest or authed). */
cartRouter.get('/', async (req, res) => {
  const cart = await cartService.resolveCart(ctxOf(req));
  res.json({ data: cartService.cartResponse(cart) });
});

/** POST /cart/items — add an item (or increase its quantity). */
cartRouter.post('/items', validate({ body: itemSchema }), async (req, res) => {
  const data = await cartService.setItemQuantity(ctxOf(req), req.body.variantId, req.body.quantity);
  res.status(201).json({ data });
});

/** PATCH /cart/items/:variantId — set exact quantity (0 removes). */
cartRouter.patch('/items/:variantId', validate({ body: updateItemSchema }), async (req, res) => {
  const data = await cartService.setItemQuantity(ctxOf(req), req.params.variantId, req.body.quantity);
  res.json({ data });
});

/** DELETE /cart/items/:variantId */
cartRouter.delete('/items/:variantId', async (req, res) => {
  const data = await cartService.setItemQuantity(ctxOf(req), req.params.variantId, 0);
  res.json({ data });
});

/** DELETE /cart — empty the cart. */
cartRouter.delete('/', async (req, res) => {
  const cart = await cartService.resolveCart(ctxOf(req));
  await cartService.clearCart(cart.id);
  res.json({ data: { cleared: true } });
});

/** PUT /cart/coupon — apply (or with {code:null} remove) a coupon code. */
cartRouter.put('/coupon', validate({ body: couponSchema }), async (req, res) => {
  const data = await cartService.applyCoupon(ctxOf(req), req.body.code?.toUpperCase() ?? null);
  res.json({ data });
});
