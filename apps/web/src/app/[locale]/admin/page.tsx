'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { api, ApiResponse } from '@/lib/api';
import { formatDate, formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AdminStats, OrderStatus, Product } from '@/lib/types';

const statusColor: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-sky-100 text-sky-700',
  PROCESSING: 'bg-indigo-100 text-indigo-700',
  SHIPPED: 'bg-violet-100 text-violet-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

export default function AdminDashboard() {
  const t = useTranslations('admin');
  const to = useTranslations('orders');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    api
      .get<ApiResponse<AdminStats>>('/admin/stats', { auth: true })
      .then((res) => setStats(res.data))
      .catch(() => undefined);
  }, []);

  if (!stats) return <div className="container-x py-24 text-center text-slate-400">{tc('loading')}</div>;

  const cards: Array<[string, string, string]> = [
    [t('revenue'), formatPrice(stats.revenue, locale), '💰'],
    [t('totalOrders'), String(stats.orders), '📦'],
    [t('ordersToday'), String(stats.ordersToday), '🆕'],
    [t('totalProducts'), String(stats.products), '🛍️'],
    [t('totalUsers'), String(stats.users), '👥'],
    [t('lowStock'), String(stats.lowStockVariants), '⚠️'],
  ];

  return (
    <div className="container-x space-y-8 py-8">
      <h1 className="text-2xl font-extrabold">{t('dashboard')}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map(([label, value, icon]) => (
          <div key={label} className="card p-5">
            <div className="mb-2 text-2xl">{icon}</div>
            <div className="text-xl font-extrabold">{value}</div>
            <div className="text-xs font-semibold text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="card p-5">
          <h2 className="mb-4 font-extrabold">{t('recentOrders')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-start text-xs text-slate-400">
                  <th className="py-2 text-start">{to('orderNumber')}</th>
                  <th className="py-2 text-start">{to('date')}</th>
                  <th className="py-2 text-start">{to('status')}</th>
                  <th className="py-2 text-start">{to('total')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 font-bold" dir="ltr">{o.orderNumber}</td>
                    <td className="py-2.5 text-slate-500">{formatDate(o.createdAt, locale)}</td>
                    <td className="py-2.5">
                      <span className={cn('badge', statusColor[o.status])}>{to(`status${o.status}`)}</span>
                    </td>
                    <td className="py-2.5 font-bold">{formatPrice(o.total, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-extrabold">{t('topProducts')}</h2>
          <ul className="space-y-3">
            {stats.topProducts.map((p: Product) => (
              <li key={p.id} className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.images[0]} alt="" className="h-11 w-11 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-bold">{locale === 'fa' ? p.nameFa : p.nameEn}</p>
                  <p className="text-xs text-slate-400">
                    {p.soldCount} {to('items')}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-extrabold text-brand-600">{formatPrice(p.minPrice, locale)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
