'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiResponse } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { errorMessage, useStore } from '@/lib/store';
import type { Address, Order } from '@/lib/types';

const emptyAddress: Address = {
  fullName: '',
  phone: '',
  province: '',
  city: '',
  postalCode: '',
  addressLine: '',
};

export function CheckoutView() {
  const t = useTranslations('checkout');
  const tc = useTranslations('common');
  const tcart = useTranslations('cart');
  const locale = useLocale();
  const { user, cart, clearCartLocal } = useStore();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [gateway, setGateway] = useState<'mock' | 'cod'>('mock');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'loading'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    api
      .get<ApiResponse<Address[]>>('/me/addresses', { auth: true })
      .then((res) => {
        setAddresses(res.data);
        const def = res.data.find((a) => a.isDefault) ?? res.data[0];
        if (def?.id) setSelectedAddressId(def.id);
        else setUseNewAddress(true);
      })
      .catch(() => undefined);
  }, [user]);

  if (!user) {
    return (
      <div className="container-x py-16 text-center">
        <p className="mb-4 font-bold">{tcart('loginToCheckout')}</p>
        <Link href={`/${locale}/auth/login`} className="btn-primary">
          {tc('login')}
        </Link>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="container-x py-16 text-center">
        <p className="mb-4 font-bold">{tcart('empty')}</p>
        <Link href={`/${locale}/catalog`} className="btn-primary">
          {tcart('continueShopping')} →
        </Link>
      </div>
    );
  }

  const validInline =
    address.fullName.length >= 3 &&
    /^09\d{9}$/.test(address.phone) &&
    address.province.length > 1 &&
    address.city.length > 1 &&
    /^\d{10}$/.test(address.postalCode) &&
    address.addressLine.length >= 5;

  const canSubmit = useNewAddress ? validInline : Boolean(selectedAddressId);

  const submit = async () => {
    setState('loading');
    setError('');
    try {
      const res = await api.post<ApiResponse<Order & { paymentUrl: string | null }>>(
        '/checkout/orders',
        {
          ...(useNewAddress ? { address } : { addressId: selectedAddressId }),
          note: note || undefined,
          gateway,
        },
        { auth: true },
      );
      const order = res.data;
      clearCartLocal();
      if (order.paymentUrl) {
        window.location.href = order.paymentUrl; // mock gateway page → redirects back
      } else {
        window.location.href = `/${locale}/checkout/success?order=${order.orderNumber}`;
      }
    } catch (err) {
      setError(errorMessage(err));
      setState('idle');
    }
  };

  return (
    <div className="container-x py-8">
      <h1 className="mb-6 text-2xl font-extrabold">{t('title')}</h1>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {/* address */}
          <section className="card p-5">
            <h2 className="mb-4 font-extrabold">{t('addressTitle')}</h2>

            {addresses.length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-sm font-bold text-slate-600">{t('savedAddresses')}</p>
                {addresses.map((a) => (
                  <label key={a.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:border-brand-300">
                    <input
                      type="radio"
                      name="address"
                      checked={!useNewAddress && selectedAddressId === a.id}
                      onChange={() => {
                        setSelectedAddressId(a.id!);
                        setUseNewAddress(false);
                      }}
                      className="mt-1"
                    />
                    <span className="text-sm">
                      <span className="font-bold">{a.fullName}</span> — {a.city}، {a.addressLine}
                      <br />
                      <span className="text-slate-500">{a.phone} · {a.postalCode}</span>
                    </span>
                  </label>
                ))}
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-brand-300">
                  <input type="radio" name="address" checked={useNewAddress} onChange={() => setUseNewAddress(true)} />
                  <span className="text-sm font-bold">{t('newAddress')}</span>
                </label>
              </div>
            )}

            {(useNewAddress || addresses.length === 0) && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t('fullName')}>
                  <input className="input" value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} />
                </Field>
                <Field label={t('phone')}>
                  <input className="input" dir="ltr" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} />
                </Field>
                <Field label={t('province')}>
                  <input className="input" value={address.province} onChange={(e) => setAddress({ ...address, province: e.target.value })} />
                </Field>
                <Field label={t('city')}>
                  <input className="input" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                </Field>
                <Field label={t('postalCode')}>
                  <input className="input" dir="ltr" value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} />
                </Field>
                <Field label={t('addressLine')} className="sm:col-span-2">
                  <textarea className="input min-h-20" value={address.addressLine} onChange={(e) => setAddress({ ...address, addressLine: e.target.value })} />
                </Field>
              </div>
            )}
          </section>

          {/* payment */}
          <section className="card p-5">
            <h2 className="mb-4 font-extrabold">{t('paymentMethod')}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${gateway === 'mock' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'}`}>
                <input type="radio" checked={gateway === 'mock'} onChange={() => setGateway('mock')} />
                <span className="text-sm font-bold">💳 {t('payMock')}</span>
              </label>
              <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${gateway === 'cod' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'}`}>
                <input type="radio" checked={gateway === 'cod'} onChange={() => setGateway('cod')} />
                <span className="text-sm font-bold">🚚 {t('payCod')}</span>
              </label>
            </div>
          </section>

          <section className="card p-5">
            <Field label={t('note')}>
              <textarea className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </section>
        </div>

        {/* summary */}
        <aside className="card h-fit space-y-3 p-5">
          <h2 className="font-extrabold">{t('summary')}</h2>
          <ul className="space-y-2 border-b border-slate-100 pb-3 text-sm">
            {cart.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-2">
                <span className="line-clamp-1 text-slate-600">
                  {locale === 'fa' ? item.product.nameFa : item.product.nameEn} × {item.quantity}
                </span>
                <span className="shrink-0 font-bold">{formatPrice(item.lineTotal, locale)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">{tcart('subtotal')}</dt>
              <dd className="font-bold">{formatPrice(cart.totals.subtotal, locale)}</dd>
            </div>
            {cart.totals.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <dt>{tcart('discount')}</dt>
                <dd className="font-bold">- {formatPrice(cart.totals.discount, locale)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-500">{tcart('shipping')}</dt>
              <dd className="font-bold">
                {cart.totals.shippingCost === 0 ? tc('free') : formatPrice(cart.totals.shippingCost, locale)}
              </dd>
            </div>
          </dl>
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="font-extrabold">{tcart('total')}</span>
            <span className="text-lg font-extrabold text-brand-600">
              {formatPrice(cart.totals.total, locale)} {tc('toman')}
            </span>
          </div>
          <button className="btn-primary w-full py-3.5" disabled={!canSubmit || state === 'loading'} onClick={submit}>
            {state === 'loading' ? tc('loading') : t('submit')}
          </button>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={className}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
