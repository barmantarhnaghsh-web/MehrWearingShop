import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

export default async function FailedPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations('checkout');
  const tc = await getTranslations('common');

  return (
    <div className="container-x py-16">
      <div className="card mx-auto max-w-lg gap-4 p-10 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-rose-100 text-3xl text-rose-600">✕</div>
        <h1 className="text-2xl font-extrabold">{t('failedTitle')}</h1>
        <p className="text-sm text-slate-500">{t('failedSubtitle')}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href={`/${locale}/cart`} className="btn-primary">
            {t('retryPayment')}
          </Link>
          <Link href={`/${locale}/catalog`} className="btn-ghost">
            {tc('viewAll')}
          </Link>
        </div>
      </div>
    </div>
  );
}
