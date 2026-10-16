'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiResponse } from '@/lib/api';
import { formatDate, formatPrice } from '@/lib/format';
import type { Order, OrderStatus, PageMeta } from '@/lib/types';
import { cn } from '@/lib/utils';

const STATUSES: OrderStatus[] = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const statusColor: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-sky-100 text-sky-700',
  PROCESSING: 'bg-indigo-100 text-indigo-700',
  SHIPPED: 'bg-violet-100 text-violet-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

export default function AdminOrdersPage() {
  const t = useTranslations('admin');
  const to = useTranslations('orders');
  const tc = useTranslations('common');
  const locale = useLocale();

  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    api
      .get<ApiResponse<Order[]>>(`/admin/orders?${params}`, { auth: true })
      .then((res) => {
        setOrders(res.data);
        setMeta(res.meta ?? null);
      })
      .catch(() => undefined);
  }, [page, status, q]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const changeStatus = async (id: string, next: OrderStatus) => {
    await api.patch(`/admin/orders/${id}/status`, { status: next }, { auth: true });
    load();
  };

  return (
    <div className="container-x space-y-6 py-8">
      <h1 className="text-2xl font-extrabold">{t('orders')}</h1>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <input className="input max-w-xs" placeholder={to('orderNumber')} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="input max-w-xs" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">— {t('status')} —</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{to(`status${s}`)}</option>
          ))}
        </select>
      </div>

      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-extrabold" dir="ltr">{o.orderNumber}</span>
                <span className="ms-3 text-xs text-slate-400">
                  {o.customer} · {formatDate(o.createdAt, locale)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className={cn('badge', statusColor[o.status])}>{to(`status${o.status}`)}</span>
                <span className="font-extrabold text-brand-600">{formatPrice(o.total, locale)}</span>
                <select className="input w-auto py-1.5 text-xs" value={o.status} onChange={(e) => void changeStatus(o.id, e.target.value as OrderStatus)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{to(`status${s}`)}</option>
                  ))}
                </select>
                <button className="btn-ghost py-1.5" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                  {tc('view')}
                </button>
              </div>
            </div>

            {expanded === o.id && (
              <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 text-sm md:grid-cols-2">
                <ul className="space-y-2">
                  {o.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-2">
                      <span>{locale === 'fa' ? item.titleFa : item.titleEn} × {item.quantity}</span>
                      <span className="font-bold">{formatPrice(item.total, locale)}</span>
                    </li>
                  ))}
                </ul>
                <div className="text-slate-500">
                  <p className="font-bold text-slate-700">{o.customer} — {o.email}</p>
                  <p className="mt-1">
                    {o.address?.province}، {o.address?.city}
                    <br />
                    {o.address?.addressLine}
                  </p>
                  <p className="mt-1" dir="ltr">{o.address?.phone} · {o.address?.postalCode}</p>
                  {o.payment && (
                    <p className="mt-2">
                      {o.payment.gateway} · {o.payment.status} {o.payment.refId && <span dir="ltr">({o.payment.refId})</span>}
                    </p>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button className="btn-ghost" disabled={!meta.hasPrev} onClick={() => setPage((p) => p - 1)}>{tc('prev')}</button>
          <span className="text-sm font-bold text-slate-500">{tc('page')} {meta.page} / {meta.totalPages}</span>
          <button className="btn-ghost" disabled={!meta.hasNext} onClick={() => setPage((p) => p + 1)}>{tc('next')}</button>
        </div>
      )}
    </div>
  );
}
