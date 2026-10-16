'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

function AdminGuard({ children }: { children: React.ReactNode }) {
  const t = useTranslations('admin');
  const tn = useTranslations('nav');
  const tc = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();
  const { user, ready } = useStore();

  useEffect(() => {
    if (ready && (!user || user.role !== 'ADMIN')) {
      window.location.href = `/${locale}/auth/login`;
    }
  }, [ready, user, locale]);

  if (!ready || !user || user.role !== 'ADMIN') {
    return <div className="container-x py-24 text-center text-slate-400">{tc('loading')}</div>;
  }

  const tabs: Array<[string, string]> = [
    [`/${locale}/admin`, t('dashboard')],
    [`/${locale}/admin/products`, t('products')],
    [`/${locale}/admin/orders`, t('orders')],
    [`/${locale}/admin/coupons`, t('coupons')],
  ];

  return (
    <div>
      <div className="border-b border-slate-100 bg-white">
        <div className="container-x flex h-14 items-center gap-1 overflow-x-auto">
          <span className="me-4 shrink-0 font-extrabold text-brand-600">{tn('admin')}</span>
          {tabs.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'shrink-0 rounded-xl px-3.5 py-2 text-sm font-bold',
                pathname === href ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Session comes from the root <MallProvider>; no nested provider here.
  return <AdminGuard>{children}</AdminGuard>;
}
