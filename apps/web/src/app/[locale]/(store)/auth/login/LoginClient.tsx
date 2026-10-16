'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { api, ApiResponse } from '@/lib/api';
import { errorMessage, useStore } from '@/lib/store';

export function LoginView() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { login, loginWithOtp } = useStore();

  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login({ email, password });
      window.location.href = `/${locale}`;
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    setError('');
    try {
      const res = await api.post<ApiResponse<{ devCode?: string }>>('/auth/otp/request', { phone });
      setOtpSent(res.data.devCode ?? '');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    setError('');
    try {
      await loginWithOtp(phone, otp);
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
        <h1 className="mb-1 text-2xl font-extrabold">{t('loginTitle')}</h1>
        <p className="mb-6 text-sm text-slate-500">{tc('appName')}</p>

        <div className="mb-6 flex rounded-xl bg-slate-100 p-1 text-sm font-bold">
          <button
            className={`flex-1 rounded-lg py-2 ${mode === 'password' ? 'bg-white shadow' : 'text-slate-500'}`}
            onClick={() => setMode('password')}
          >
            {tc('login')}
          </button>
          <button
            className={`flex-1 rounded-lg py-2 ${mode === 'otp' ? 'bg-white shadow' : 'text-slate-500'}`}
            onClick={() => setMode('otp')}
          >
            {t('orPhone')}
          </button>
        </div>

        {mode === 'password' ? (
          <form onSubmit={submitPassword} className="space-y-4">
            <label className="block">
              <span className="label">{t('email')}</span>
              <input className="input" dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="block">
              <span className="label">{t('password')}</span>
              <input className="input" dir="ltr" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <button className="btn-primary w-full py-3" disabled={loading}>
              {loading ? tc('loading') : t('submitLogin')}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <span className="label">{t('phone')}</span>
              <input className="input" dir="ltr" placeholder="09xxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            {!otpSent ? (
              <button className="btn-primary w-full py-3" onClick={sendOtp} disabled={!/^09\d{9}$/.test(phone)}>
                {t('otpSend')}
              </button>
            ) : (
              <>
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                  {t('otpDevHint')}: <span dir="ltr">{otpSent}</span>
                </p>
                <label className="block">
                  <span className="label">{t('otpCode')}</span>
                  <input className="input text-center tracking-[0.5em]" dir="ltr" maxLength={5} value={otp} onChange={(e) => setOtp(e.target.value)} />
                </label>
                <button className="btn-primary w-full py-3" onClick={verifyOtp} disabled={otp.length !== 5 || loading}>
                  {t('otpVerify')}
                </button>
              </>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

        <p className="mt-6 text-center text-sm text-slate-500">
          {t('noAccount')}{' '}
          <Link href={`/${locale}/auth/register`} className="font-bold text-brand-600 hover:underline">
            {tc('register')}
          </Link>
        </p>
      </div>
    </div>
  );
}
