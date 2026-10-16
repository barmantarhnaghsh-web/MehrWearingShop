import { describe, expect, it } from 'vitest';
import { evaluateCoupon, formatToman } from '../lib/money';
import { FREE_SHIPPING_THRESHOLD } from '../modules/cart/cart.service';

describe('evaluateCoupon', () => {
  const now = new Date('2026-01-15T12:00:00Z');

  it('applies percentage coupons', () => {
    const result = evaluateCoupon({ type: 'PERCENT', value: 10 }, 2_000_000, now);
    expect(result).toEqual({ valid: true, discount: 200_000 });
  });

  it('applies fixed coupons', () => {
    const result = evaluateCoupon({ type: 'FIXED', value: 150_000 }, 1_000_000, now);
    expect(result).toEqual({ valid: true, discount: 150_000 });
  });

  it('caps percentage discount by maxDiscount', () => {
    const result = evaluateCoupon({ type: 'PERCENT', value: 50, maxDiscount: 100_000 }, 2_000_000, now);
    expect(result.discount).toBe(100_000);
  });

  it('never discounts more than the subtotal', () => {
    const result = evaluateCoupon({ type: 'FIXED', value: 5_000_000 }, 200_000, now);
    expect(result.discount).toBe(200_000);
    expect(result.valid).toBe(true);
  });

  it('rejects below minimum order amount', () => {
    const result = evaluateCoupon({ type: 'PERCENT', value: 10, minOrderAmount: 500_000 }, 100_000, now);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('MIN_AMOUNT');
    expect(result.discount).toBe(0);
  });

  it('rejects expired coupons', () => {
    const result = evaluateCoupon(
      { type: 'PERCENT', value: 10, expiresAt: new Date('2026-01-01T00:00:00Z') },
      1_000_000,
      now,
    );
    expect(result.reason).toBe('EXPIRED');
  });

  it('rejects not-yet-active coupons', () => {
    const result = evaluateCoupon(
      { type: 'PERCENT', value: 10, startsAt: new Date('2026-02-01T00:00:00Z') },
      1_000_000,
      now,
    );
    expect(result.reason).toBe('NOT_STARTED');
  });

  it('rejects inactive coupons', () => {
    const result = evaluateCoupon({ type: 'PERCENT', value: 10, isActive: false }, 1_000_000, now);
    expect(result.reason).toBe('NOT_ACTIVE');
  });

  it('floors percentage discounts to whole tomans', () => {
    const result = evaluateCoupon({ type: 'PERCENT', value: 7 }, 999, now);
    expect(result.discount).toBe(69);
  });
});

describe('formatToman', () => {
  it('formats with Persian digits and unit', () => {
    expect(formatToman(1250000, 'fa-IR')).toContain('تومان');
    expect(formatToman(1250000, 'en-US')).toBe('1,250,000 Toman');
  });
});

describe('shipping rules', () => {
  it('exposes a free-shipping threshold constant', () => {
    expect(FREE_SHIPPING_THRESHOLD).toBe(500_000);
  });
});
