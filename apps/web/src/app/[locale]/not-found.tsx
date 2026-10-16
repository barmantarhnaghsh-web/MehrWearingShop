import { getTranslations } from 'next-intl/server';
import { Link } from '@/navigation';

export default async function NotFoundPage() {
  const t = await getTranslations('common');
  return (
    <div className="container-x grid min-h-[60vh] place-items-center py-16 text-center">
      <div className="card max-w-md p-10">
        <div className="mb-4 text-6xl">🛍️</div>
        <h1 className="mb-2 text-2xl font-extrabold">404</h1>
        <p className="mb-6 text-slate-500">{t('notFound')}</p>
        <Link href="/" className="btn-primary">
          {t('back')}
        </Link>
      </div>
    </div>
  );
}
