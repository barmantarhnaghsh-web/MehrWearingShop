import { env, isProd } from '../../config/env';
import { logger } from '../../lib/logger';

/**
 * Minimal ZarinPal v4 REST client (sandbox or production).
 * Docs: https://docs.zarinpal.com/paymentGateway/
 */

const GATEWAY_BASE = env.ZARINPAL_SANDBOX
  ? 'https://sandbox.zarinpal.com/pg'
  : 'https://payment.zarinpal.com/pg';

interface RequestPayload {
  merchant_id: string;
  amount: number; // IRR in the gateway contract; we send Toman and note it in callback handling
  callback_url: string;
  description: string;
  metadata?: { email?: string; mobile?: string };
}

/** Start a payment and return the gateway authority code. */
export async function createZarinpalPayment(
  amountToman: number,
  description: string,
  metadata: { email?: string; mobile?: string } = {},
): Promise<string> {
  if (!env.ZARINPAL_MERCHANT_ID) {
    logger.warn('ZARINPAL_MERCHANT_ID missing — falling back to a synthetic authority (dev)');
    return `dev-${Math.random().toString(36).slice(2, 10)}`;
  }

  const payload: RequestPayload = {
    merchant_id: env.ZARINPAL_MERCHANT_ID,
    amount: amountToman,
    callback_url: `${env.API_PUBLIC_URL}/api/v1/payments/zarinpal/callback`,
    description: `MehrWearingShop order ${description}`,
    metadata,
  };

  const res = await fetch(`${GATEWAY_BASE}/Request.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = (await res.json()) as { data?: { authority?: string }; errors?: unknown };
  const authority = body.data?.authority;
  if (!authority) {
    logger.error({ errors: body.errors }, 'zarinpal request failed');
    throw new Error('Payment gateway rejected the request');
  }
  return authority;
}

/** Verify a completed payment; returns the gateway receipt id. */
export async function verifyZarinpalPayment(
  authority: string,
  amountToman: number,
): Promise<{ ok: boolean; refId?: string; code: number }> {
  if (authority.startsWith('dev-')) {
    // Synthetic authority created when no merchant id is configured (local dev).
    return { ok: isProd ? false : true, refId: `devref-${Date.now()}`, code: isProd ? -50 : 100 };
  }

  const res = await fetch(`${GATEWAY_BASE}/Verify.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      merchant_id: env.ZARINPAL_MERCHANT_ID,
      amount: amountToman,
      authority,
    }),
  });
  const body = (await res.json()) as { data?: { ref_id?: string }; errors?: { code?: number } };
  const code = body.errors?.code ?? (body.data?.ref_id ? 100 : -1);
  return { ok: code === 100 || code === 101, refId: body.data?.ref_id, code };
}
