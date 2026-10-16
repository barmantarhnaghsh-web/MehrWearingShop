'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { useStore, errorMessage } from '@/lib/store';
import { formatPrice } from '@/lib/format';

export function CartView() {
  const t = useTranslations('cart');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { cart, setCartQty, removeFromCart, applyCoupon, user } = useStore();

  const [couponInput, setCouponInput] = useState(cart.couponCode ?? '');
  const [couponState, setCouponState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [couponError, setCouponError] = useState('');

  const apply = async () => {
    setCouponState('loading');
    setCouponError('');
    try {
      await applyCoupon(couponInput.trim() || null);
    } catch (err) {
      setCouponError(errorMessage(err));
      setCouponState('error');
    } finally {
      setCouponState('idle');
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="container-x py-16">
        <div className="card mx-auto grid max-w-lg place-items-center gap-4 p-12 text-center">
          <span className="text-5xl">🛒</span>
          <h1 className="text-xl font-extrabold">{t('empty')}</h1>
          <Link href={`/${locale}/catalog`} className="btn-primary">
            {t('continueShopping')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-8">
      <h1 className="mb-6 text-2xl font-extrabold">{t('title')}</h1>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ul className="space-y-3">
          {cart.items.map((item) => (
            <li key={item.id} className="card flex items-center gap-4 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.product.image ?? 'https://picsum.photos/seed/cart/200/200'} alt="" className="h-20 w-20 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <Link href={`/${locale}/product/${item.product.slug}`} className="line-clamp-1 text-sm font-bold hover:text-brand-600">
                  {locale === 'fa' ? item.product.nameFa : item.product.nameEn}
                </Link>
                <p className="mt-1 text-xs text-slate-500">
                  {locale === 'fa' ? item.variant.nameFa : item.variant.nameEn} · {item.sku}
                </p>
                <p className="mt-1 text-sm font-extrabold text-brand-600">
                  {formatPrice(item.unitPrice, locale)} {tc('toman')}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center rounded-xl border border-slate-200">
                  <button className="px-3 py-1.5 font-bold" onClick={() => void setCartQty(item.variantId, item.quantity - 1)}>
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                  <button
                    className="px-3 py-1.5 font-bold"
                    disabled={item.quantity >= Math.min(item.stock, 10)}
                    onClick={() => void setCartQty(item.variantId, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <button className="text-xs font-bold text-rose-500 hover:underline" onClick={() => void removeFromCart(item.variantId)}>
                  {t('remove')}
                </button>
              </div>
            </li>
          ))}
        </ul>

        <aside className="card h-fit space-y-4 p-5">
          <h2 className="font-extrabold">{t('title')}</h2>

          <div className="flex gap-2">
            <input
              className="input"
              placeholder={t('couponPlaceholder')}
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
            />
            <button className="btn-ghost shrink-0" onClick={apply} disabled={couponState === 'loading'}>
              {t('applyCoupon')}
            </button>
          </div>
          {couponError && <p className="text-xs text-rose-600">{couponError}</p>}
          {cart.totals.discount > 0 && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
              ✓ {t('couponApplied')}: {cart.totals.couponCode}
            </p>
          )}

          <dl className="space-y-2 border-t border-slate-100 pt-4 text-sm">
            <Row label={t('subtotal')} value={formatPrice(cart.totals.subtotal, locale)} />
            {cart.totals.discount > 0 && (
              <Row label={t('discount')} value={`- ${formatPrice(cart.totals.discount, locale)}`} accent="text-emerald-600" />
            )}
            <Row
              label={t('shipping')}
              value={cart.totals.shippingCost === 0 ? tc('free') : formatPrice(cart.totals.shippingCost, locale)}
            />
          </dl>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="font-extrabold">{t('total')}</span>
            <span className="text-lg font-extrabold text-brand-600">
              {formatPrice(cart.totals.total, locale)} {tc('toman')}
            </span>
          </div>

          <p className="rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">{t('freeShippingHint')}</p>

          <Link
            href={user ? `/${locale}/checkout` : `/${locale}/auth/login`}
            className="btn-primary w-full py-3"
          >
            {user ? t('checkout') : t('loginToCheckout')}
          </Link>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`font-bold ${accent ?? 'text-slate-800'}`}>{value}</dd>
    </div>
  );
}
