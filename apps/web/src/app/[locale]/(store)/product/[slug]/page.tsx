import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { ProductPurchasePanel } from '@/components/ProductPurchasePanel';
import { ReviewSection } from '@/components/ReviewSection';
import { StarRating } from '@/components/StarRating';
import { getProduct, getProducts, serverFetch } from '@/lib/server';
import type { Product, Review } from '@/lib/types';
import { formatPrice } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ProductPage({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations('product');
  const tc = await getTranslations('common');

  const [productRes, relatedRes, reviewsRes] = await Promise.all([
    getProduct(slug),
    serverFetch<Product[]>(`/products/${slug}/related`, 300),
    serverFetch<Review[]>(`/products/${slug}/reviews?limit=10`),
  ]);

  const product = productRes?.data as Product | undefined;
  if (!product) notFound();

  const related = (relatedRes?.data as Product[]) ?? [];
  const reviews = (reviewsRes?.data as Review[]) ?? [];
  const localized = locale === 'fa';

  return (
    <div className="container-x py-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* gallery */}
        <div className="space-y-3">
          <div className="card overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img id="main-image" src={product.images[0]} alt={product.nameEn} className="aspect-square w-full object-cover" />
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt=""
                  className="h-20 w-20 shrink-0 cursor-pointer rounded-xl border border-slate-200 object-cover hover:border-brand-500"
                  onMouseEnter={undefined}
                />
              ))}
            </div>
          )}
        </div>

        {/* purchase panel */}
        <div className="space-y-4">
          {product.brand && (
            <span className="badge bg-slate-100 text-slate-600">{localized ? product.brand.nameFa : product.brand.nameEn}</span>
          )}
          <h1 className="text-2xl font-extrabold leading-9">{localized ? product.nameFa : product.nameEn}</h1>

          <div className="flex items-center gap-3 text-sm">
            <StarRating value={product.ratingAvg} />
            <span className="text-slate-500">
              {product.ratingAvg} ({product.ratingCount})
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">
              {product.soldCount} {t('sold')}
            </span>
          </div>

          <ProductPurchasePanel product={product} />

          <ul className="card space-y-2 p-4 text-sm text-slate-600">
            <li>✔ {t('guarantee')}</li>
            <li>🚚 {t('sendBy')}</li>
            <li>↩️ {tc('appName')}</li>
          </ul>
        </div>
      </div>

      {/* description + specs */}
      <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="card p-6">
          <h2 className="mb-4 text-lg font-extrabold">{t('description')}</h2>
          <p className="whitespace-pre-line text-sm leading-8 text-slate-600">
            {(localized ? product.descriptionFa : product.descriptionEn) ?? '—'}
          </p>
        </section>
        <section className="card p-6">
          <h2 className="mb-4 text-lg font-extrabold">{t('specs')}</h2>
          <table className="w-full text-sm">
            <tbody>
              {product.attributes &&
                Object.entries(product.attributes).map(([key, value]) => (
                  <tr key={key} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 text-slate-500">{key}</td>
                    <td className="py-2.5 font-bold text-slate-800">{String(value)}</td>
                  </tr>
                ))}
              <tr className="border-b border-slate-100">
                <td className="py-2.5 text-slate-500">{tc('price')}</td>
                <td className="py-2.5 font-bold text-brand-600">
                  {formatPrice(product.basePrice, locale)} {tc('toman')}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      <ReviewSection productSlug={product.slug} reviews={reviews} />

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-5 text-xl font-extrabold">{t('related')}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
