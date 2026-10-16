'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useStore, errorMessage } from '@/lib/store';

export function AddToCartButton({ variantId, disabled }: { variantId?: string; disabled?: boolean }) {
  const t = useTranslations('common');
  const tp = useTranslations('product');
  const { addToCart } = useStore();
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const onAdd = async () => {
    if (!variantId) return;
    setState('loading');
    try {
      await addToCart(variantId, 1);
      setState('done');
      setTimeout(() => setState('idle'), 2000);
    } catch (err) {
      setMessage(errorMessage(err));
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button onClick={onAdd} disabled={!variantId || disabled} className="btn-primary w-full py-3.5 text-base disabled:opacity-40">
        {state === 'done' ? '✓' : t('addToCart')}
      </button>
      {state === 'error' && <p className="text-sm text-rose-600">{message}</p>}
      {!variantId && <p className="text-sm text-rose-600">{tp('outOfStock')}</p>}
    </div>
  );
}
