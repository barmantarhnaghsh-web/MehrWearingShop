'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { formatPrice } from '@/lib/format';
import type { Product } from '@/lib/types';
import { useStore } from '@/lib/store';
import { StarRating } from './StarRating';

export function ProductCard({ product }: { product: Product }) {
  const t = useTranslations('common');
  const tp = useTranslations('product');
  const locale = useLocale();
  const { addToCart } = useStore();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const name = locale === 'fa' ? product.nameFa : product.nameEn;
  const firstVariant = product.variants[0];

  const onAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!firstVariant || adding) return;
    setAdding(true);
    try {
      await addToCart(firstVariant.id, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 1600);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Link
      href={`/${locale}/product/${product.slug}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-lift"
    >
      {/* Portrait 4:5 frame — the standard proportion for apparel. */}
      <div className="relative aspect-[4/5] overflow-hidden bg-brand-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.images[0] ?? '/images/products/placeholder.svg'}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute start-3 top-3 flex flex-col gap-1.5">
          {product.isNew && <span className="badge bg-camel-500 text-white">New</span>}
          {product.ratingAvg >= 4.5 && product.soldCount > 50 && (
            <span className="badge bg-brand-900 text-camel-400">Best seller</span>
          )}
          {product.stock === 0 && (
            <span className="badge bg-brand-950/80 text-white">{tp('outOfStock')}</span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 min-h-11 text-sm font-bold leading-6 text-brand-900">{name}</h3>
        <div className="flex items-center gap-1.5">
          <StarRating value={product.ratingAvg} size={13} />
          <span className="text-xs text-brand-400">({product.ratingCount})</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2">
          <div>
            <div className="text-lg font-extrabold text-brand-900">
              {formatPrice(product.minPrice, locale)}{' '}
              <span className="text-xs font-semibold text-brand-500">{t('toman')}</span>
            </div>
            {product.stock === 0 && <div className="text-xs font-bold text-rose-600">{tp('outOfStock')}</div>}
          </div>
          <button
            onClick={onAdd}
            disabled={!firstVariant || product.stock === 0 || adding}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-900 text-white transition hover:bg-camel-500 disabled:opacity-40"
            aria-label={t('addToCart')}
          >
            {added ? '✓' : '+'}
          </button>
        </div>
      </div>
    </Link>
  );
}
