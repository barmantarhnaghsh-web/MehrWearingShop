'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiResponse } from '@/lib/api';
import { formatDate, formatPrice } from '@/lib/format';
import { useStore } from '@/lib/store';
import type { Order, OrderStatus, PageMeta } from '@/lib/types';
import { cn } from '@/lib/utils';

const statusColor: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-sky-100 text-sky-700',
  PROCESSING: 'bg-indigo-100 text-indigo-700',
  SHIPPED: 'bg-violet-100 text-violet-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

export function AccountView() {
  const t = useTranslations('orders');
  const ta = useTranslations('account');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { user } = useStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api
      .get<ApiResponse<Order[]>>(`/orders?page=${page}&limit=10`, { auth: true })
      .then((res) => {
        setOrders(res.data);
        setMeta(res.meta ?? null);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [user, page]);

  if (!user) {
    return (
      <div className="container-x py-16 text-center">
        <Link href={`/${locale}/auth/login`} className="btn-primary">
          {tc('login')}
        </Link>
      </div>
    );
  }

  const cancel = async (id: string) => {
    if (!window.confirm(t('cancelConfirm'))) return;
    await api.post(`/orders/${id}/cancel`, undefined, { auth: true });
    setPage((p) => p); // trigger refetch
    const res = await api.get<ApiResponse<Order[]>>(`/orders?page=${page}&limit=10`, { auth: true });
    setOrders(res.data);
  };

  return (
    <div className="container-x py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">
            {ta('welcome')} {user.firstName} {user.lastName} 👋
          </h1>
          <p className="text-sm text-slate-500">{user.email}</p>
        </div>
        <nav className="flex gap-2 text-sm">
          <Link href={`/${locale}/account`} className="btn-primary">{t('title')}</Link>
          <Link href={`/${locale}/account/wishlist`} className="btn-ghost">{ta('myWishlist')}</Link>
          <Link href={`/${locale}/account/addresses`} className="btn-ghost">{ta('myAddresses')}</Link>
        </nav>
      </div>

      {loading ? (
        <p className="py-16 text-center text-slate-400">{tc('loading')}</p>
      ) : orders.length === 0 ? (
        <div className="card grid place-items-center gap-3 p-16 text-center">
          <span className="text-4xl">📦</span>
          <p className="font-bold text-slate-600">{t('empty')}</p>
          <Link href={`/${locale}/catalog`} className="btn-primary">{tc('viewAll')}</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-extrabold" dir="ltr">{order.orderNumber}</span>
                  <span className="ms-3 text-xs text-slate-400">{formatDate(order.createdAt, locale)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('badge', statusColor[order.status])}>{t(`status${order.status}`)}</span>
                  <span className="font-extrabold text-brand-600">
                    {formatPrice(order.total, locale)} {tc('toman')}
                  </span>
                  <button className="btn-ghost py-1.5" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                    {t('view')}
                  </button>
                  {order.status === 'PENDING' && (
                    <button className="btn-ghost py-1.5 text-rose-600" onClick={() => void cancel(order.id)}>
                      {t('cancel')}
                    </button>
                  )}
                </div>
              </div>

              {expanded === order.id && (
                <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.imageUrl ?? 'https://picsum.photos/seed/order/100/100'} alt="" className="h-12 w-12 rounded-lg object-cover" />
                      <span className="flex-1">
                        {locale === 'fa' ? item.titleFa : item.titleEn}
                        {item.variantNameFa || item.variantNameEn ? ` — ${locale === 'fa' ? item.variantNameFa : item.variantNameEn}` : ''}
                      </span>
                      <span className="text-slate-500">× {item.quantity}</span>
                      <span className="font-bold">{formatPrice(item.total, locale)}</span>
                    </li>
                  ))}
                  <li className="pt-2 text-xs text-slate-500">
                    {order.address?.province}، {order.address?.city} — {order.address?.addressLine}
                  </li>
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button className="btn-ghost" disabled={!meta.hasPrev} onClick={() => setPage((p) => p - 1)}>{tc('prev')}</button>
          <span className="px-3 text-sm font-bold text-slate-500">
            {tc('page')} {meta.page} / {meta.totalPages}
          </span>
          <button className="btn-ghost" disabled={!meta.hasNext} onClick={() => setPage((p) => p + 1)}>{tc('next')}</button>
        </div>
      )}
    </div>
  );
}
