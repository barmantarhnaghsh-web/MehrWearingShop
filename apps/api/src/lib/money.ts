/**
 * All monetary amounts are integer Toman (Iranian Rial / 10).
 * Keeping money as integers avoids floating point drift in totals/discounts.
 */

export interface CouponInput {
  type: 'PERCENT' | 'FIXED';
  value: number;
  minOrderAmount?: number | null;
  maxDiscount?: number | null;
}

export interface CouponEvaluation {
  valid: boolean;
  reason?: 'NOT_ACTIVE' | 'NOT_STARTED' | 'EXPIRED' | 'USAGE_LIMIT' | 'MIN_AMOUNT';
  discount: number;
}

/** Compute the discount a coupon grants for a given subtotal. Pure & unit-tested. */
export function evaluateCoupon(
  coupon: CouponInput & { isActive?: boolean; startsAt?: Date; expiresAt?: Date | null },
  subtotal: number,
  now: Date = new Date(),
): CouponEvaluation {
  if (coupon.isActive === false) return { valid: false, reason: 'NOT_ACTIVE', discount: 0 };
  if (coupon.startsAt && coupon.startsAt > now) return { valid: false, reason: 'NOT_STARTED', discount: 0 };
  if (coupon.expiresAt && coupon.expiresAt < now) return { valid: false, reason: 'EXPIRED', discount: 0 };
  if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
    return { valid: false, reason: 'MIN_AMOUNT', discount: 0 };
  }

  let discount = coupon.type === 'PERCENT' ? Math.floor((subtotal * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, subtotal); // never exceed the order value
  return { valid: discount > 0, discount: Math.max(0, discount) };
}

export function formatToman(amount: number, locale: 'fa-IR' | 'en-US' = 'fa-IR'): string {
  return `${new Intl.NumberFormat(locale).format(amount)} ${locale === 'fa-IR' ? 'تومان' : 'Toman'}`;
}
