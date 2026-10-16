'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiResponse } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import type { PageMeta, Product } from '@/lib/types';

export default function AdminProductsPage() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const locale = useLocale();

  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');

  const load = useCallback(() => {
    api
      .get<ApiResponse<Product[]>>(`/admin/products?page=${page}&limit=20&q=${encodeURIComponent(q)}`, { auth: true })
      .then((res) => {
        setProducts(res.data);
        setMeta(res.meta ?? null);
      })
      .catch(() => undefined);
  }, [page, q]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const archive = async (id: string) => {
    await api.delete(`/admin/products/${id}`, { auth: true });
    load();
  };

  return (
    <div className="container-x space-y-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">{t('products')}</h1>
        <Link href={`/${locale}/admin/products/new`} className="btn-primary">
          + {t('newProduct')}
        </Link>
      </div>

      <div className="card p-4">
        <input
          className="input"
          placeholder={tc('search')}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="p-3 text-start">{t('productNameFa')}</th>
              <th className="p-3 text-start">{t('addVariant')}</th>
              <th className="p-3 text-start">{t('basePrice')}</th>
              <th className="p-3 text-start">{t('stock')}</th>
              <th className="p-3 text-start">{t('status')}</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.images[0]} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    <span className="font-bold">{locale === 'fa' ? p.nameFa : p.nameEn}</span>
                  </div>
                </td>
                <td className="p-3 text-slate-500">{p.variants.length}</td>
                <td className="p-3 font-bold">{formatPrice(p.basePrice, locale)}</td>
                <td className="p-3">{p.stock}</td>
                <td className="p-3">
                  <span className={`badge ${p.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/${locale}/admin/products/${p.id}/edit`} className="btn-ghost py-1.5">
                      {tc('edit')}
                    </Link>
                    <button className="btn-ghost py-1.5 text-rose-600" onClick={() => void archive(p.id)}>
                      {tc('delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button className="btn-ghost" disabled={!meta.hasPrev} onClick={() => setPage((p) => p - 1)}>{tc('prev')}</button>
          <span className="text-sm font-bold text-slate-500">
            {tc('page')} {meta.page} / {meta.totalPages}
          </span>
          <button className="btn-ghost" disabled={!meta.hasNext} onClick={() => setPage((p) => p + 1)}>{tc('next')}</button>
        </div>
      )}
    </div>
  );
}
