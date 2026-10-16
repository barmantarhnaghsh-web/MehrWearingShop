'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Product, Variant } from '@/lib/types';
import { formatPrice, pick } from '@/lib/format';
import { useStore, errorMessage } from '@/lib/store';
import { api } from '@/lib/api';

/** Variant picker + quantity + add-to-cart / buy-now. */
export function ProductPurchasePanel({ product }: { product: Product }) {
  const t = useTranslations('common');
  const tp = useTranslations('product');
  const twn = useTranslations('nav');
  const locale = useLocale();
  const { addToCart, user } = useStore();
  const [wished, setWished] = useState(false);

  const [variantId, setVariantId] = useState<string | undefined>(
    product.variants.find((v) => v.stock > 0)?.id ?? product.variants[0]?.id,
  );
  const [quantity, setQuantity] = useState(1);
  const [state, setState] = useState<'idle' | 'loading'>('idle');
  const [error, setError] = useState('');

  const variant = useMemo<Variant | undefined>(
    () => product.variants.find((v) => v.id === variantId),
    [product.variants, variantId],
  );

  const price = variant?.price ?? product.minPrice;
  const maxQty = Math.min(variant?.stock ?? 0, 10);

  const add = async (buyNow = false) => {
    if (!variant) return;
    setState('loading');
    setError('');
    try {
      await addToCart(variant.id, quantity);
      if (buyNow) window.location.href = `/${locale}/cart`;
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setState('idle');
    }
  };

  // Attribute groups to render as chips (color / size / storage …).
  const attributeKeys = useMemo(() => {
    const keys = new Set<string>();
    product.variants.forEach((v) => Object.keys(v.attributes ?? {}).forEach((k) => keys.add(k)));
    return [...keys];
  }, [product.variants]);

  return (
    <div className="card space-y-5 p-5">
      <div className="text-2xl font-extrabold text-brand-600">
        {formatPrice(price, locale)} <span className="text-sm text-slate-500">{t('toman')}</span>
      </div>

      {attributeKeys.map((key) => (
        <div key={key}>
          <p className="mb-2 text-sm font-bold text-slate-700">
            {key === 'color' ? tp('color') : key === 'size' ? tp('size') : key === 'storage' ? tp('storage') : key}
          </p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => {
              const active = v.id === variantId;
              return (
                <button
                  key={v.id}
                  disabled={v.stock === 0}
                  onClick={() => {
                    setVariantId(v.id);
                    setQuantity(1);
                  }}
                  className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    active ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                  title={v.stock === 0 ? tp('outOfStock') : undefined}
                >
                  {v.nameFa || v.nameEn ? pick(v, locale) : Object.values(v.attributes ?? {}).join(' / ')}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div>
        <p className="mb-2 text-sm font-bold text-slate-700">{tp('quantity')}</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl border border-slate-200">
            <button className="px-4 py-2 text-lg font-bold" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1}>
              −
            </button>
            <span className="w-10 text-center font-bold">{quantity}</span>
            <button className="px-4 py-2 text-lg font-bold" onClick={() => setQuantity((q) => Math.min(maxQty || 1, q + 1))} disabled={quantity >= maxQty}>
              +
            </button>
          </div>
          <span className={`text-sm font-bold ${variant && variant.stock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {variant && variant.stock > 0 ? `${variant?.stock} ${tp('inStock')}` : tp('outOfStock')}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button className="btn-primary py-3.5" disabled={!variant || variant.stock === 0 || state === 'loading'} onClick={() => add(false)}>
          {state === 'loading' ? t('loading') : t('addToCart')}
        </button>
        <button
          className="btn-ghost py-2.5"
          disabled={!user}
          title={user ? undefined : t('login')}
          onClick={async () => {
            if (!user || wished) return;
            try {
              await api.post(`/wishlist/${product.id}`, undefined, { auth: true });
              setWished(true);
            } catch {
              /* ignore */
            }
          }}
        >
          {wished ? '♥' : '♡'} {twn('wishlist')}
        </button>
        <Link
          href={`/${locale}/cart`}
          className="btn-ghost py-3.5"
          onClick={(e) => {
            e.preventDefault();
            void add(true);
          }}
        >
          {t('buyNow')}
        </Link>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </div>
  );
}
