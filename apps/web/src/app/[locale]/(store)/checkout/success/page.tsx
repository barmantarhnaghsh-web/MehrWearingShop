import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { serverFetch } from '@/lib/server';
import { formatPrice } from '@/lib/format';

export const dynamic = 'force-dynamic';

interface PublicOrder {
  orderNumber: string;
  status: string;
  total: number;
  itemCount: number;
  paymentStatus: string | null;
  createdAt: string;
}

export default async function SuccessPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { order?: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations('checkout');
  const tc = await getTranslations('common');
  const tcart = await getTranslations('cart');

  const orderRes = searchParams.order
    ? await serverFetch<PublicOrder>(`/orders/public/${encodeURIComponent(searchParams.order)}`)
    : null;
  const order = orderRes?.data;

  return (
    <div className="container-x py-16">
      <div className="card mx-auto max-w-lg gap-4 p-10 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-3xl text-emerald-600">✓</div>
        <h1 className="text-2xl font-extrabold text-slate-900">{t('successTitle')}</h1>
        <p className="text-sm text-slate-500">{t('successSubtitle')}</p>

        {order && (
          <dl className="mx-auto mt-4 w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">{t('orderNumber')}</dt>
              <dd className="font-extrabold" dir="ltr">{order.orderNumber}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">{tcart('total')}</dt>
              <dd className="font-extrabold">
                {formatPrice(order.total, locale)} {tc('toman')}
              </dd>
            </div>
          </dl>
        )}

        <div className="mt-6 flex justify-center gap-3">
          <Link href={`/${locale}/account`} className="btn-primary">
            {t('trackOrders')}
          </Link>
          <Link href={`/${locale}/catalog`} className="btn-ghost">
            {tcart('continueShopping')}
          </Link>
        </div>
      </div>
    </div>
  );
}
