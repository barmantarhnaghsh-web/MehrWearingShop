'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiResponse } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { useStore } from '@/lib/store';
import type { Product } from '@/lib/types';

export function WishlistView() {
  const t = useTranslations('wishlist');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { user, addToCart } = useStore();

  const [items, setItems] = useState<Product[]>([]);

  const load = useCallback(() => {
    api
      .get<ApiResponse<Product[]>>('/wishlist', { auth: true })
      .then((res) => setItems(res.data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (!user) {
    return (
      <div className="container-x py-16 text-center">
        <Link href={`/${locale}/auth/login`} className="btn-primary">{tc('login')}</Link>
      </div>
    );
  }

  const remove = async (productId: string) => {
    await api.delete(`/wishlist/${productId}`, { auth: true });
    load();
  };

  return (
    <div className="container-x py-8">
      <h1 className="mb-6 text-2xl font-extrabold">{t('title')}</h1>

      {items.length === 0 ? (
        <div className="card grid place-items-center gap-3 p-16 text-center">
          <span className="text-4xl">💛</span>
          <p className="font-bold text-slate-600">{t('empty')}</p>
          <Link href={`/${locale}/catalog`} className="btn-primary">{tc('viewAll')}</Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((p) => (
            <li key={p.id} className="card overflow-hidden">
              <Link href={`/${locale}/product/${p.slug}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.images[0]} alt="" className="aspect-square w-full object-cover" />
              </Link>
              <div className="space-y-2 p-4">
                <Link href={`/${locale}/product/${p.slug}`} className="line-clamp-2 text-sm font-bold hover:text-brand-600">
                  {locale === 'fa' ? p.nameFa : p.nameEn}
                </Link>
                <p className="font-extrabold text-brand-600">
                  {formatPrice(p.minPrice, locale)} <span className="text-xs text-slate-500">{tc('toman')}</span>
                </p>
                <div className="flex gap-2">
                  <button
                    className="btn-primary flex-1 py-2"
                    disabled={!p.variants[0]}
                    onClick={() => p.variants[0] && void addToCart(p.variants[0].id, 1)}
                  >
                    {tc('addToCart')}
                  </button>
                  <button className="btn-ghost py-2 text-rose-600" onClick={() => void remove(p.id)}>✕</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
