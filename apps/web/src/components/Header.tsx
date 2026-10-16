'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { usePathname, useRouter as useIntlRouter } from '@/navigation';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Menswear category strip — slugs must match apps/api/prisma/seed.ts. */
const NAV_CATEGORIES = [
  { slug: 'shirts', key: 'catShirts' },
  { slug: 'tshirts', key: 'catTshirts' },
  { slug: 'pants', key: 'catPants' },
  { slug: 'shoes', key: 'catShoes' },
  { slug: 'outerwear', key: 'catOuterwear' },
  { slug: 'accessories', key: 'catAccessories' },
] as const;

export function Header() {
  const t = useTranslations('common');
  const tn = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();
  const intlRouter = useIntlRouter();
  const pathname = usePathname();
  const { user, cartCount, logout } = useStore();

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<
    Array<Pick<Product, 'slug' | 'nameFa' | 'nameEn' | 'minPrice' | 'images'>>
  >([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Debounced autocomplete.
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await api.get<{ data: Pick<Product, 'slug' | 'nameFa' | 'nameEn' | 'minPrice' | 'images'>[] }>(
          `/search/suggest?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        setSuggestions(res.data);
      } catch {
        /* ignore */
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSuggestions([]);
    router.push(`/${locale}/catalog?q=${encodeURIComponent(query.trim())}`);
  };

  const switchLocale = (next: 'fa' | 'en') => {
    intlRouter.replace(pathname, { locale: next });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/95 backdrop-blur">
      {/* top bar */}
      <div className="bg-brand-950 text-white">
        <div className="container-x flex h-9 items-center justify-between text-xs">
          <span>{locale === 'fa' ? 'ارسال رایگان برای سفارش‌های بالای ۵۰۰ هزار تومان • تعویض رایگان سایز تا ۱۰ روز' : 'Free shipping over 500,000 Toman • Free size exchange within 10 days'}</span>
          <div className="flex items-center gap-3">
            <button onClick={() => switchLocale(locale === 'fa' ? 'en' : 'fa')} className="font-bold hover:underline">
              {locale === 'fa' ? 'English' : 'فارسی'}
            </button>
            <span className="hidden sm:inline">۰۲۱-۹۱۰۰۰۰۰۰</span>
          </div>
        </div>
      </div>

      <div className="container-x flex h-16 items-center gap-4">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-900 font-display text-lg font-bold text-camel-400">م</span>
          <span className="hidden font-display text-xl font-bold text-brand-900 sm:block">{t('appName')}</span>
        </Link>

        {/* search */}
        <form onSubmit={onSearch} className="relative hidden flex-1 md:block">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search')}
            className="input bg-brand-50 focus:bg-white"
            aria-label={t('search')}
          />
          {suggestions.length > 0 && (
            <div className="absolute inset-x-0 top-12 overflow-hidden rounded-xl border border-brand-100 bg-white shadow-lift">
              {suggestions.map((s) => (
                <Link
                  key={s.slug}
                  href={`/${locale}/product/${s.slug}`}
                  onClick={() => setSuggestions([])}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-brand-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.images[0]} alt="" className="h-9 w-9 rounded-md object-cover" />
                  <span className="flex-1 text-sm font-semibold">
                    {locale === 'fa' ? s.nameFa : s.nameEn}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </form>

        <nav className="ms-auto flex items-center gap-1">
          <Link href={`/${locale}/cart`} className="relative rounded-lg p-2.5 hover:bg-brand-100" aria-label={t('cart')}>
            <CartIcon />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -end-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-camel-500 px-1 text-[11px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-brand-100"
              >
                <UserIcon />
                <span className="hidden lg:block">{user.firstName}</span>
              </button>
              {menuOpen && (
                <div className="absolute end-0 top-12 w-52 overflow-hidden rounded-xl border border-brand-100 bg-white shadow-lift">
                  <Link href={`/${locale}/account`} onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-brand-50">
                    {tn('orders')}
                  </Link>
                  <Link href={`/${locale}/account/wishlist`} onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-brand-50">
                    {tn('wishlist')}
                  </Link>
                  <Link href={`/${locale}/account/addresses`} onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-brand-50">
                    {tn('addresses')}
                  </Link>
                  {user.role === 'ADMIN' && (
                    <Link href={`/${locale}/admin`} onClick={() => setMenuOpen(false)} className="block border-t border-brand-100 px-4 py-2.5 text-sm font-bold text-camel-600 hover:bg-brand-50">
                      {tn('admin')}
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      void logout();
                    }}
                    className="block w-full border-t border-brand-100 px-4 py-2.5 text-start text-sm text-red-600 hover:bg-brand-50"
                  >
                    {t('logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href={`/${locale}/auth/login`} className="btn-primary hidden sm:inline-flex">
              {t('login')}
            </Link>
          )}

          <button className="rounded-lg p-2.5 hover:bg-brand-100 md:hidden" onClick={() => setMobileOpen((v) => !v)} aria-label="menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </nav>
      </div>

      {/* category strip */}
      <div className="hidden border-t border-brand-100 bg-white md:block">
        <div className="container-x flex h-11 items-center gap-6 text-sm font-semibold text-brand-600">
          <Link href={`/${locale}`} className="hover:text-camel-600">{tn('home')}</Link>
          <Link href={`/${locale}/catalog?sort=newest`} className="text-camel-600 hover:text-camel-700">{tn('newArrivals')}</Link>
          {NAV_CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/${locale}/catalog?category=${c.slug}`} className="hover:text-camel-600">
              {tn(c.key)}
            </Link>
          ))}
          <Link href={`/${locale}/catalog?sort=bestselling`} className="ms-auto hover:text-camel-600">{tn('offers')}</Link>
        </div>
      </div>

      {/* mobile menu */}
      <div className={cn('border-t border-brand-100 bg-white md:hidden', mobileOpen ? 'block' : 'hidden')}>
        <form onSubmit={onSearch} className="p-3">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('search')} className="input bg-brand-50" />
        </form>
        <div className="flex flex-col p-3 pt-0 text-sm font-semibold">
          <Link href={`/${locale}`} onClick={() => setMobileOpen(false)} className="py-2">{tn('home')}</Link>
          <Link href={`/${locale}/catalog`} onClick={() => setMobileOpen(false)} className="py-2">{tn('catalog')}</Link>
          {NAV_CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/${locale}/catalog?category=${c.slug}`} onClick={() => setMobileOpen(false)} className="py-2">
              {tn(c.key)}
            </Link>
          ))}
          <Link href={`/${locale}/account`} onClick={() => setMobileOpen(false)} className="py-2">{tn('orders')}</Link>
          <Link href={`/${locale}/auth/login`} onClick={() => setMobileOpen(false)} className="py-2">{t('login')}</Link>
        </div>
      </div>
    </header>
  );
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" />
      <circle cx="10" cy="20" r="1.4" />
      <circle cx="17" cy="20" r="1.4" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </svg>
  );
}
