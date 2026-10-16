'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/navigation';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { Brand, Category } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Current {
  q?: string;
  category?: string;
  brand?: string;
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
}

export function FiltersPanel({
  categories,
  brands,
  current,
}: {
  categories: Category[];
  brands: Brand[];
  current: Current;
}) {
  const t = useTranslations('catalog');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [minPrice, setMinPrice] = useState(current.minPrice ?? '');
  const [maxPrice, setMaxPrice] = useState(current.maxPrice ?? '');

  const apply = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    params.delete('page');
    router.push(`/${locale}${pathname}?${params.toString()}`);
  };

  const sortOptions: Array<[string, string]> = [
    ['', t('sortNewest')],
    ['price-asc', t('sortPriceAsc')],
    ['price-desc', t('sortPriceDesc')],
    ['bestselling', t('sortBestSelling')],
    ['rating', t('sortRating')],
  ];

  return (
    <aside className="card h-fit space-y-6 p-5">
      <div>
        <h3 className="mb-3 font-extrabold">{t('sort')}</h3>
        <div className="flex flex-col gap-1.5">
          {sortOptions.map(([value, label]) => (
            <button
              key={value}
              onClick={() => apply({ sort: value })}
              className={cn(
                'rounded-lg px-3 py-1.5 text-start text-sm',
                (current.sort ?? '') === value ? 'bg-brand-600 font-bold text-white' : 'text-slate-600 hover:bg-slate-50',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-extrabold">{t('category')}</h3>
        <div className="flex flex-col gap-1.5">
          <FilterChip label={locale === 'fa' ? 'همه دسته‌بندی‌ها' : 'All categories'} active={!current.category} onClick={() => apply({ category: undefined })} />
          {categories.flatMap((c) => [c, ...(c.children ?? [])]).map((c) => (
            <FilterChip
              key={c.id}
              label={locale === 'fa' ? c.nameFa : c.nameEn}
              active={current.category === c.slug}
              onClick={() => apply({ category: c.slug })}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-extrabold">{t('brand')}</h3>
        <select
          className="input"
          value={current.brand ?? ''}
          onChange={(e) => apply({ brand: e.target.value || undefined })}
        >
          <option value="">{locale === 'fa' ? 'همه برندها' : 'All brands'}</option>
          {brands.map((b) => (
            <option key={b.id} value={b.slug}>
              {locale === 'fa' ? b.nameFa : b.nameEn}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="mb-3 font-extrabold">{t('priceRange')}</h3>
        <div className="flex items-center gap-2">
          <input className="input" inputMode="numeric" placeholder={t('minPrice')} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
          <span className="text-slate-400">–</span>
          <input className="input" inputMode="numeric" placeholder={t('maxPrice')} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
        </div>
        <button className="btn-primary mt-3 w-full" onClick={() => apply({ minPrice: minPrice || undefined, maxPrice: maxPrice || undefined })}>
          {t('apply')}
        </button>
      </div>

      <div>
        <h3 className="mb-3 font-extrabold">{t('rating')}</h3>
        <div className="flex flex-wrap gap-1.5">
          {[4, 3, 2].map((r) => (
            <FilterChip key={r} label={`${r} ★ ${t('ratingUp')}`} active={current.minRating === String(r)} onClick={() => apply({ minRating: String(r) })} />
          ))}
          {current.minRating && (
            <button className="text-xs font-bold text-brand-600 underline" onClick={() => apply({ minRating: undefined })}>
              {t('clearFilters')}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-lg px-3 py-1.5 text-start text-sm',
        active ? 'bg-brand-50 font-bold text-brand-700' : 'text-slate-600 hover:bg-slate-50',
      )}
    >
      {label}
    </button>
  );
}
