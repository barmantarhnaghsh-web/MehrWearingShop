'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { StarRating } from './StarRating';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { errorMessage, useStore } from '@/lib/store';
import type { Review } from '@/lib/types';

export function ReviewSection({ productSlug, reviews }: { productSlug: string; reviews: Review[] }) {
  const t = useTranslations('product');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { user } = useStore();

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async () => {
    setState('loading');
    setError('');
    try {
      await api.post(`/products/${productSlug}/reviews`, { rating, title: title || undefined, body }, { auth: true });
      setState('done');
      setTitle('');
      setBody('');
      window.location.reload();
    } catch (err) {
      setError(errorMessage(err));
      setState('error');
    }
  };

  return (
    <section className="card mt-12 p-6">
      <h2 className="mb-6 text-xl font-extrabold">{t('reviews')}</h2>

      {reviews.length === 0 ? (
        <p className="text-sm text-slate-500">—</p>
      ) : (
        <ul className="space-y-5">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-slate-100 pb-5 last:border-0 last:pb-0">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-bold">{r.author}</span>
                <span className="text-xs text-slate-400">{formatDate(r.createdAt, locale)}</span>
              </div>
              <StarRating value={r.rating} size={13} />
              {r.title && <p className="mt-2 text-sm font-extrabold">{r.title}</p>}
              <p className="mt-1 text-sm leading-7 text-slate-600">{r.body}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 rounded-2xl bg-slate-50 p-5">
        <h3 className="mb-4 font-extrabold">{t('writeReview')}</h3>
        {!user ? (
          <Link href={`/${locale}/auth/login`} className="text-sm font-bold text-brand-600 hover:underline">
            {t('reviewLoginRequired')}
          </Link>
        ) : state === 'done' ? (
          <p className="text-sm font-bold text-emerald-600">✓ {t('reviewThanks')}</p>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-sm font-bold">{t('yourRating')}</p>
              <StarRating value={rating} size={22} onChange={setRating} />
            </div>
            <input className="input" placeholder={t('reviewTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea className="input min-h-24" placeholder={t('reviewBody')} value={body} onChange={(e) => setBody(e.target.value)} />
            <div className="flex items-center gap-3">
              <button className="btn-primary" onClick={submit} disabled={body.trim().length < 5 || state === 'loading'}>
                {t('submitReview')}
              </button>
              {state === 'error' && <span className="text-sm text-rose-600">{error}</span>}
            </div>
          </div>
        )}
      </div>
      <span className="sr-only">{tc('appName')}</span>
    </section>
  );
}
