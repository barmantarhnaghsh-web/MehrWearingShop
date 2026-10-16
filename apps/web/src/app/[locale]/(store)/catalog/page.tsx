import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ProductCard } from '@/components/ProductCard';
import { Pagination } from '@/components/Pagination';
import { FiltersPanel } from '@/components/FiltersPanel';
import { getCategories, getProducts, serverFetch } from '@/lib/server';
import type { Brand, Category, PageMeta, Product } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface SearchParams {
  q?: string;
  category?: string;
  brand?: string;
  sort?: string;
  page?: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
}

export default async function CatalogPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: SearchParams;
}) {
  setRequestLocale(locale);
  const t = await getTranslations('catalog');

  const params = new URLSearchParams();
  if (searchParams.q) params.set('q', searchParams.q);
  if (searchParams.category) params.set('category', searchParams.category);
  if (searchParams.brand) params.set('brand', searchParams.brand);
  if (searchParams.sort) params.set('sort', searchParams.sort);
  if (searchParams.page) params.set('page', searchParams.page);
  if (searchParams.minPrice) params.set('minPrice', searchParams.minPrice);
  if (searchParams.maxPrice) params.set('maxPrice', searchParams.maxPrice);
  if (searchParams.minRating) params.set('minRating', searchParams.minRating);
  params.set('limit', '12');

  const [productsRes, catRes, brandRes] = await Promise.all([
    getProducts(`?${params.toString()}`),
    getCategories(),
    serverFetch<Brand[]>('/brands', 300),
  ]);

  const products = (productsRes?.data as Product[]) ?? [];
  const meta = (productsRes?.meta as PageMeta) ?? {
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };
  const categories = (catRes?.data as Category[]) ?? [];
  const brands = (brandRes?.data as Brand[]) ?? [];

  return (
    <div className="container-x py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">
          {searchParams.q ? `“${searchParams.q}”` : t('title')}
        </h1>
        <span className="text-sm font-semibold text-slate-400">{meta.total} {t('title')}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <FiltersPanel categories={categories} brands={brands} current={searchParams} />

        <div>
          {products.length === 0 ? (
            <div className="card grid place-items-center gap-3 p-16 text-center">
              <span className="text-4xl">🔍</span>
              <p className="font-bold text-slate-600">{t('noResults')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
          <Pagination meta={meta} />
        </div>
      </div>
    </div>
  );
}
