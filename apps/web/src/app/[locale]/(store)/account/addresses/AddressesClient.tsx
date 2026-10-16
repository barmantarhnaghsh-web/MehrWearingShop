'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiResponse } from '@/lib/api';
import { errorMessage, useStore } from '@/lib/store';
import type { Address } from '@/lib/types';

const blank: Address = { fullName: '', phone: '', province: '', city: '', postalCode: '', addressLine: '' };

export function AddressesView() {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const tco = useTranslations('checkout');
  const locale = useLocale();
  const { user } = useStore();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState<Address>(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api
      .get<ApiResponse<Address[]>>('/me/addresses', { auth: true })
      .then((res) => setAddresses(res.data))
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

  const save = async () => {
    setError('');
    try {
      if (editing) await api.patch(`/me/addresses/${editing}`, form, { auth: true });
      else await api.post('/me/addresses', form, { auth: true });
      setForm(blank);
      setEditing(null);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const remove = async (id: string) => {
    await api.delete(`/me/addresses/${id}`, { auth: true });
    load();
  };

  const set = (key: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="container-x py-8">
      <h1 className="mb-6 text-2xl font-extrabold">{t('myAddresses')}</h1>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <ul className="space-y-3">
          {addresses.length === 0 && <li className="card p-8 text-center text-sm text-slate-500">—</li>}
          {addresses.map((a) => (
            <li key={a.id} className="card flex items-start justify-between gap-4 p-5">
              <div className="text-sm">
                <p className="font-extrabold">
                  {a.fullName} {a.isDefault && <span className="badge bg-brand-50 text-brand-700 ms-2">{t('defaultBadge')}</span>}
                </p>
                <p className="mt-1 text-slate-600">{a.province}، {a.city} — {a.addressLine}</p>
                <p className="mt-1 text-slate-400">{a.phone} · {a.postalCode}</p>
              </div>
              <div className="flex shrink-0 gap-2 text-sm">
                <button
                  className="btn-ghost py-1.5"
                  onClick={() => {
                    setForm({ fullName: a.fullName, phone: a.phone, province: a.province, city: a.city, postalCode: a.postalCode, addressLine: a.addressLine, isDefault: a.isDefault });
                    setEditing(a.id ?? null);
                  }}
                >
                  {tc('edit')}
                </button>
                <button className="btn-ghost py-1.5 text-rose-600" onClick={() => void remove(a.id!)}>
                  {tc('delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>

        <aside className="card h-fit space-y-3 p-5">
          <h2 className="font-extrabold">{editing ? tc('edit') : t('addAddress')}</h2>
          <input className="input" placeholder={tco('fullName')} value={form.fullName} onChange={set('fullName')} />
          <input className="input" dir="ltr" placeholder={tco('phone')} value={form.phone} onChange={set('phone')} />
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder={tco('province')} value={form.province} onChange={set('province')} />
            <input className="input" placeholder={tco('city')} value={form.city} onChange={set('city')} />
          </div>
          <input className="input" dir="ltr" placeholder={tco('postalCode')} value={form.postalCode} onChange={set('postalCode')} />
          <textarea className="input min-h-20" placeholder={tco('addressLine')} value={form.addressLine} onChange={set('addressLine')} />
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={form.isDefault ?? false} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} />
            {t('setAsDefault')}
          </label>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={save}>{tc('save')}</button>
            {editing && (
              <button className="btn-ghost" onClick={() => { setEditing(null); setForm(blank); }}>
                {tc('cancel')}
              </button>
            )}
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </aside>
      </div>
    </div>
  );
}
