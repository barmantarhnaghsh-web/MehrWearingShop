'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { errorMessage, useStore } from '@/lib/store';

export function RegisterView() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { register } = useStore();

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register({ ...form, phone: form.phone || undefined });
      window.location.href = `/${locale}`;
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-x flex justify-center py-14">
      <div className="card w-full max-w-md p-8">
        <h1 className="mb-6 text-2xl font-extrabold">{t('registerTitle')}</h1>

        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">{t('firstName')}</span>
            <input className="input" value={form.firstName} onChange={set('firstName')} required />
          </label>
          <label className="block">
            <span className="label">{t('lastName')}</span>
            <input className="input" value={form.lastName} onChange={set('lastName')} required />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">{t('email')}</span>
            <input className="input" dir="ltr" type="email" value={form.email} onChange={set('email')} required />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">{t('password')}</span>
            <input className="input" dir="ltr" type="password" minLength={8} value={form.password} onChange={set('password')} required />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">{t('phone')} ({tc('yes')})</span>
            <input className="input" dir="ltr" placeholder="09xxxxxxxxx" value={form.phone} onChange={set('phone')} />
          </label>

          <button className="btn-primary py-3 sm:col-span-2" disabled={loading}>
            {loading ? tc('loading') : t('submitRegister')}
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

        <p className="mt-6 text-center text-sm text-slate-500">
          {t('haveAccount')}{' '}
          <Link href={`/${locale}/auth/login`} className="font-bold text-brand-600 hover:underline">
            {tc('login')}
          </Link>
        </p>
      </div>
    </div>
  );
}
