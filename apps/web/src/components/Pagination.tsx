'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/navigation';
import { useSearchParams } from 'next/navigation';
import type { PageMeta } from '@/lib/types';

export function Pagination({ meta }: { meta: PageMeta }) {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (meta.totalPages <= 1) return null;

  const go = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`/${locale}${pathname}?${params.toString()}`);
  };

  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      <button className="btn-ghost" disabled={!meta.hasPrev} onClick={() => go(meta.page - 1)}>
        {t('prev')}
      </button>
      <span className="px-3 text-sm font-semibold text-slate-600">
        {t('page')} {meta.page} / {meta.totalPages}
      </span>
      <button className="btn-ghost" disabled={!meta.hasNext} onClick={() => go(meta.page + 1)}>
        {t('next')}
      </button>
    </div>
  );
}
