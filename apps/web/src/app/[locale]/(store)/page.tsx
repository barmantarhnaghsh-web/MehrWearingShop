import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { getCategories, getProducts } from '@/lib/server';
import type { Category, Product } from '@/lib/types';

export default async function HomePage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const tc = await getTranslations('common');

  const [featuredRes, newRes, bestRes, catRes] = await Promise.all([
    getProducts('?sort=newest&limit=8&minRating=4'),
    getProducts('?sort=newest&limit=8'),
    getProducts('?sort=bestselling&limit=8'),
    getCategories(),
  ]);

  const featured = (featuredRes?.data as Product[]) ?? [];
  const newArrivals = (newRes?.data as Product[]) ?? [];
  const bestSellers = (bestRes?.data as Product[]) ?? [];
  const categories = (catRes?.data as Category[]) ?? [];

  return (
    <div>
      {/* Hero — editorial menswear */}
      <section className="relative overflow-hidden bg-brand-950 text-white">
        {/* camel rule accents */}
        <div className="absolute inset-y-0 end-0 hidden w-1/3 bg-gradient-to-l from-camel-500/20 to-transparent md:block" />
        <div className="container-x relative flex flex-col items-start gap-6 py-16 md:py-24">
          <span className="kicker text-camel-400">{t('heroBadge')}</span>
          <h1 className="max-w-2xl font-display text-3xl font-bold leading-tight md:text-5xl">{t('heroTitle')}</h1>
          <p className="max-w-xl text-sm leading-7 text-brand-200 md:text-base">{t('heroSubtitle')}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/${locale}/catalog`} className="btn bg-camel-500 px-6 py-3 text-white hover:bg-camel-600">
              {t('heroCta')} →
            </Link>
            <Link
              href={`/${locale}/catalog?sort=newest`}
              className="btn border border-brand-600 px-6 py-3 text-white hover:bg-brand-800"
            >
              {t('seasonCta')}
            </Link>
          </div>
        </div>
      </section>

      <div className="container-x space-y-14 py-12">
        {/* Categories */}
        {categories.length > 0 && (
          <section>
            <SectionTitle kicker={t('categoriesKicker')} title={t('categoriesTitle')} />
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/${locale}/catalog?category=${c.slug}`}
                  className="card group flex flex-col items-center gap-2 p-5 text-center transition hover:-translate-y-1 hover:shadow-lift"
                >
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-3xl transition group-hover:bg-camel-100">
                    {c.icon ?? '👕'}
                  </span>
                  <span className="text-xs font-bold text-brand-800 sm:text-sm">
                    {locale === 'fa' ? c.nameFa : c.nameEn}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <ProductRow kicker={t('featuredKicker')} title={t('featuredTitle')} products={featured} locale={locale} viewAll={tc('viewAll')} />

        {/* Season band */}
        <section className="overflow-hidden rounded-2xl bg-camel-500 text-white">
          <div className="flex flex-col items-start gap-4 p-8 md:flex-row md:items-center md:justify-between md:p-12">
            <div>
              <span className="kicker text-white/80">{t('seasonBadge')}</span>
              <h2 className="mt-2 max-w-lg font-display text-2xl font-bold leading-snug md:text-3xl">{t('seasonTitle')}</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/85">{t('seasonBody')}</p>
            </div>
            <Link
              href={`/${locale}/catalog?sort=newest`}
              className="btn shrink-0 bg-white px-6 py-3 text-brand-900 hover:bg-brand-50"
            >
              {t('seasonCta')} →
            </Link>
          </div>
        </section>

        <ProductRow kicker={t('newArrivalsKicker')} title={t('newArrivalsTitle')} products={newArrivals} locale={locale} viewAll={tc('viewAll')} />
        <ProductRow kicker={t('bestSellersKicker')} title={t('bestSellersTitle')} products={bestSellers} locale={locale} viewAll={tc('viewAll')} />

        {/* Why us */}
        <section>
          <SectionTitle kicker={t('whyKicker')} title={t('whyTitle')} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card p-6">
                <div className="mb-3 grid h-11 w-11 place-items-center rounded-lg bg-brand-900 text-lg font-bold text-camel-400">
                  {['✓', '↺', '✈', '✂'][i - 1]}
                </div>
                <h3 className="mb-1.5 font-extrabold">{t(`why${i}Title`)}</h3>
                <p className="text-sm leading-6 text-brand-500">{t(`why${i}Body`)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-5">
      <span className="kicker">{kicker}</span>
      <div className="mt-1.5 flex items-center gap-3">
        <span className="h-6 w-1.5 rounded-full bg-camel-500" />
        <h2 className="font-display text-xl font-bold md:text-2xl">{title}</h2>
      </div>
    </div>
  );
}

function ProductRow({
  kicker,
  title,
  products,
  locale,
  viewAll,
}: {
  kicker: string;
  title: string;
  products: Product[];
  locale: string;
  viewAll: string;
}) {
  if (products.length === 0) return null;
  return (
    <section>
      <div className="mb-5 flex items-end justify-between">
        <SectionTitle kicker={kicker} title={title} />
        <Link href={`/${locale}/catalog`} className="mb-1 text-sm font-bold text-camel-600 hover:underline">
          {viewAll} →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.slice(0, 8).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
