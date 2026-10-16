'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiResponse } from '@/lib/api';
import { formatDate, formatPrice } from '@/lib/format';
import { errorMessage } from '@/lib/store';
import type { Coupon } from '@/lib/types';

export default function AdminCouponsPage() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const tcart = useTranslations('cart');
  const locale = useLocale();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState({ code: '', type: 'PERCENT', value: '', minOrderAmount: '', maxDiscount: '', usageLimit: '', expiresAt: '' });
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get<ApiResponse<Coupon[]>>('/admin/coupons', { auth: true }).then((r) => setCoupons(r.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    setError('');
    try {
      await api.post(
        '/admin/coupons',
        {
          code: form.code.toUpperCase(),
          type: form.type,
          value: Number(form.value),
          minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
          maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
          usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        },
        { auth: true },
      );
      setForm({ code: '', type: 'PERCENT', value: '', minOrderAmount: '', maxDiscount: '', usageLimit: '', expiresAt: '' });
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const toggle = async (coupon: Coupon) => {
    await api.patch(`/admin/coupons/${coupon.code}`, { isActive: !coupon.isActive }, { auth: true });
    load();
  };

  const remove = async (code: string) => {
    await api.delete(`/admin/coupons/${code}`, { auth: true });
    load();
  };

  return (
    <div className="container-x space-y-6 py-8">
      <h1 className="text-2xl font-extrabold">{t('coupons')}</h1>

      <div className="card grid gap-3 p-5 sm:grid-cols-3 lg:grid-cols-7">
        <input className="input uppercase" placeholder={`${t('code')}*`} dir="ltr" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="PERCENT">{t('percent')}</option>
          <option value="FIXED">{t('fixed')}</option>
        </select>
        <input className="input" inputMode="numeric" placeholder={`${t('value')}*`} dir="ltr" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
        <input className="input" inputMode="numeric" placeholder={tcart('subtotal')} dir="ltr" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} />
        <input className="input" inputMode="numeric" placeholder="Max" dir="ltr" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} />
        <input className="input" type="date" dir="ltr" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
        <button className="btn-primary" onClick={create} disabled={!form.code || !form.value}>
          + {t('newCoupon')}
        </button>
        {error && <p className="text-sm text-rose-600 sm:col-span-3 lg:col-span-7">{error}</p>}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="p-3 text-start">{t('code')}</th>
              <th className="p-3 text-start">{t('type')}</th>
              <th className="p-3 text-start">{t('value')}</th>
              <th className="p-3 text-start">{t('uses')}</th>
              <th className="p-3 text-start">{t('expires')}</th>
              <th className="p-3 text-start">{t('active')}</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.code} className="border-t border-slate-100">
                <td className="p-3 font-extrabold" dir="ltr">{c.code}</td>
                <td className="p-3">{c.type === 'PERCENT' ? t('percent') : t('fixed')}</td>
                <td className="p-3 font-bold">
                  {c.type === 'PERCENT' ? `${c.value}%` : formatPrice(c.value, locale)}
                </td>
                <td className="p-3">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
                <td className="p-3 text-slate-500">{c.expiresAt ? formatDate(c.expiresAt, locale) : '—'}</td>
                <td className="p-3">
                  <span className={`badge ${c.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {c.isActive ? tc('yes') : tc('no')}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <button className="btn-ghost py-1.5" onClick={() => void toggle(c)}>
                      {c.isActive ? tc('no') : tc('yes')}
                    </button>
                    <button className="btn-ghost py-1.5 text-rose-600" onClick={() => void remove(c.code)}>
                      {tc('delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
