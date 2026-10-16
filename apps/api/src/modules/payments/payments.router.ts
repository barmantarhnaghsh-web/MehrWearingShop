import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/http-error';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { requireAdmin } from '../../middleware/auth';
import { restockOrder } from '../orders/orders.service';
import { verifyZarinpalPayment } from './zarinpal';

export const paymentsRouter = Router();

/** Mark an order as paid (single place for every gateway). */
async function markPaid(paymentId: string, refId: string | null) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
  if (!payment) throw ApiError.notFound('Payment not found');
  if (payment.status === 'PAID') return payment; // idempotent

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'PAID', refId, paidAt: new Date() },
    }),
    prisma.order.update({ where: { id: payment.orderId }, data: { status: 'PAID' } }),
  ]);
  logger.info({ orderId: payment.orderId, refId }, 'payment settled');
  return payment;
}

// ---------------------------------------------------------------------------
// Mock gateway — local/demo checkout without a real PSP
// ---------------------------------------------------------------------------

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** GET /payments/mock/:paymentId — a tiny bilingual confirmation page. */
paymentsRouter.get('/mock/:paymentId', async (req, res) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.paymentId },
    include: { order: { include: { items: true } } },
  });
  if (!payment) throw ApiError.notFound('Payment not found');
  if (payment.status === 'PAID') {
    return res.redirect(successPath(payment.order.orderNumber));
  }

  const html = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>درگاه پرداخت آزمایشی | MehrWearingShop</title>
<style>
  body{font-family:Vazirmatn,Tahoma,system-ui,sans-serif;background:#0f172a;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
  .card{background:#fff;border-radius:16px;padding:32px;max-width:420px;width:92%;box-shadow:0 20px 60px rgba(0,0,0,.35)}
  h1{font-size:18px;margin:0 0 4px;color:#0f172a} p{color:#64748b;font-size:13px;margin:4px 0}
  .amount{font-size:28px;font-weight:800;color:#e11d48;margin:16px 0}
  .row{display:flex;justify-content:space-between;font-size:13px;color:#334155;padding:6px 0;border-top:1px dashed #e2e8f0}
  button{width:100%;margin-top:20px;padding:14px;border:0;border-radius:12px;background:#e11d48;color:#fff;font-size:16px;font-weight:700;cursor:pointer}
  button.cancel{background:#e2e8f0;color:#334155;margin-top:10px}
  .badge{display:inline-block;background:#fef2f2;color:#e11d48;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:700}
</style>
</head>
<body>
  <div class="card">
    <span class="badge">MOCK GATEWAY / درگاه آزمایشی</span>
    <h1>پرداخت سفارش ${escapeHtml(payment.order.orderNumber)}</h1>
    <p>This is a simulated payment page for development. No real money moves.</p>
    <div class="amount">${new Intl.NumberFormat('fa-IR').format(payment.amount)} تومان</div>
    <div class="row"><span>اقلام</span><span>${payment.order.items.reduce((s, i) => s + i.quantity, 0)}</span></div>
    <form method="POST" action="/api/v1/payments/mock/${escapeHtml(payment.id)}/confirm">
      <button type="submit">پرداخت موفق / Pay successfully</button>
    </form>
    <form method="POST" action="/api/v1/payments/mock/${escapeHtml(payment.id)}/fail">
      <button type="submit" class="cancel">انصراف / Cancel</button>
    </form>
  </div>
</body>
</html>`;
  res.type('html').send(html);
});

function successPath(orderNumber: string) {
  return `/fa/checkout/success?order=${encodeURIComponent(orderNumber)}`;
}

function failPath(orderNumber: string) {
  return `/fa/checkout/failed?order=${encodeURIComponent(orderNumber)}`;
}

/**
 * Absolute variants — only for the ZarinPal hop: the browser returns from the
 * payment gateway to the API's public origin, which can differ from the web
 * app's origin. Mock-gateway redirects stay path-only so they resolve against
 * whatever origin the customer is actually browsing (proxied preview,
 * single-domain nginx, localhost …).
 */
function successRedirect(orderNumber: string) {
  return `${env.WEB_PUBLIC_URL}${successPath(orderNumber)}`;
}
function failRedirect(orderNumber: string) {
  return `${env.WEB_PUBLIC_URL}${failPath(orderNumber)}`;
}

paymentsRouter.post('/mock/:paymentId/confirm', async (req, res) => {
  const payment = await prisma.payment.findUnique({ where: { id: req.params.paymentId }, include: { order: true } });
  if (!payment) throw ApiError.notFound('Payment not found');
  await markPaid(payment.id, `MOCK-${Date.now()}`);
  res.redirect(successPath(payment.order.orderNumber));
});

paymentsRouter.post('/mock/:paymentId/fail', async (req, res) => {
  const payment = await prisma.payment.findUnique({ where: { id: req.params.paymentId }, include: { order: true } });
  if (!payment) throw ApiError.notFound('Payment not found');
  if (payment.status !== 'PAID') {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
      await tx.order.update({ where: { id: payment.orderId }, data: { status: 'CANCELLED' } });
      await restockOrder(tx, payment.orderId);
    });
  }
  res.redirect(failPath(payment.order.orderNumber));
});

// ---------------------------------------------------------------------------
// ZarinPal
// ---------------------------------------------------------------------------

/** GET /payments/zarinpal/callback?Authority=&Status= */
paymentsRouter.get('/zarinpal/callback', async (req, res) => {
  const authority = String(req.query.Authority ?? '');
  const status = String(req.query.Status ?? '');

  const payment = await prisma.payment.findFirst({
    where: { authority },
    include: { order: true },
  });
  if (!payment) throw ApiError.notFound('Payment session not found');

  if (status !== 'OK') {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
      await tx.order.update({ where: { id: payment.orderId }, data: { status: 'CANCELLED' } });
      await restockOrder(tx, payment.orderId);
    });
    return res.redirect(failRedirect(payment.order.orderNumber));
  }

  const result = await verifyZarinpalPayment(authority, payment.amount);
  if (!result.ok) {
    logger.error({ code: result.code, authority }, 'zarinpal verification failed');
    return res.redirect(failRedirect(payment.order.orderNumber));
  }

  await markPaid(payment.id, result.refId ?? null);
  res.redirect(successRedirect(payment.order.orderNumber));
});

/** POST /payments/:id/refund — admin-side refund marker. */
paymentsRouter.post('/:id/refund', requireAdmin, async (req, res) => {
  const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
  if (!payment) throw ApiError.notFound('Payment not found');
  if (payment.status !== 'PAID') throw ApiError.unprocessable('Only paid payments can be refunded');
  await prisma.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
  res.json({ data: { refunded: true } });
});
