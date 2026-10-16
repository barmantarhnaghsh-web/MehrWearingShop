'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { api, ApiResponse } from '@/lib/api';
import { errorMessage } from '@/lib/store';
import type { Brand, Category, Product } from '@/lib/types';

interface VariantDraft {
  sku: string;
  nameFa: string;
  nameEn: string;
  price: string;
  stock: string;
}

/** Shared create/edit form for admin products. */
export function ProductForm({ product }: { product?: Product }) {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const locale = useLocale();

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [form, setForm] = useState({
    nameFa: product?.nameFa ?? '',
    nameEn: product?.nameEn ?? '',
    descriptionFa: product?.descriptionFa ?? '',
    descriptionEn: product?.descriptionEn ?? '',
    basePrice: String(product?.basePrice ?? ''),
    categoryId: product?.category?.id ?? '',
    brandId: product?.brand?.id ?? '',
    images: (product?.images ?? []).join('\n'),
    status: product?.status ?? 'ACTIVE',
    isFeatured: product?.isFeatured ?? false,
  });
  const [variants, setVariants] = useState<VariantDraft[]>(
    product?.variants.length
      ? product.variants.map((v) => ({
          sku: v.sku,
          nameFa: v.nameFa ?? '',
          nameEn: v.nameEn ?? '',
          price: v.price != null ? String(v.price) : '',
          stock: String(v.stock),
        }))
      : [{ sku: '', nameFa: '', nameEn: '', price: '', stock: '0' }],
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<ApiResponse<Category[]>>('/admin/categories', { auth: true }).then((r) => setCategories(r.data)).catch(() => undefined);
    api.get<ApiResponse<Brand[]>>('/admin/brands', { auth: true }).then((r) => setBrands(r.data)).catch(() => undefined);
  }, []);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const setVariant = (index: number, key: keyof VariantDraft, value: string) =>
    setVariants((vs) => vs.map((v, i) => (i === index ? { ...v, [key]: value } : v)));

  const submit = async () => {
    setSaving(true);
    setError('');
    const payload = {
      nameFa: form.nameFa,
      nameEn: form.nameEn,
      descriptionFa: form.descriptionFa || null,
      descriptionEn: form.descriptionEn || null,
      basePrice: Number(form.basePrice),
      categoryId: form.categoryId,
      brandId: form.brandId || null,
      images: form.images.split('\n').map((s) => s.trim()).filter(Boolean),
      status: form.status,
      isFeatured: form.isFeatured,
      variants: variants
        .filter((v) => v.sku)
        .map((v) => ({
          sku: v.sku,
          nameFa: v.nameFa || null,
          nameEn: v.nameEn || null,
          price: v.price ? Number(v.price) : null,
          stock: Number(v.stock || 0),
        })),
    };
    try {
      if (product) {
        const { variants: _variants, ...patch } = payload;
        await api.patch(`/admin/products/${product.id}`, patch, { auth: true });
        for (const v of payload.variants) {
          const existing = product.variants.find((x) => x.sku === v.sku);
          if (existing) {
            await api.patch(
              `/admin/variants/${existing.id}`,
              { stock: v.stock, price: v.price, nameFa: v.nameFa, nameEn: v.nameEn },
              { auth: true },
            );
          } else {
            await api.post(`/admin/products/${product.id}/variants`, v, { auth: true });
          }
        }
      } else {
        await api.post('/admin/products', payload, { auth: true });
      }
      window.location.href = `/${locale}/admin/products`;
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <section className="card space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="label">{t('productNameFa')} *</span>
              <input className="input" value={form.nameFa} onChange={set('nameFa')} />
            </label>
            <label>
              <span className="label">{t('productNameEn')} *</span>
              <input className="input" dir="ltr" value={form.nameEn} onChange={set('nameEn')} />
            </label>
          </div>
          <label className="block">
            <span className="label">{t('productDescFa')}</span>
            <textarea className="input min-h-24" value={form.descriptionFa} onChange={set('descriptionFa')} />
          </label>
          <label className="block">
            <span className="label">{t('productDescEn')}</span>
            <textarea className="input min-h-24" dir="ltr" value={form.descriptionEn} onChange={set('descriptionEn')} />
          </label>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="font-extrabold">{t('addVariant')}</h2>
          {variants.map((v, i) => (
            <div key={i} className="grid items-end gap-3 border-b border-slate-100 pb-4 last:border-0 sm:grid-cols-5">
              <label>
                <span className="label">{t('sku')} *</span>
                <input className="input" dir="ltr" value={v.sku} onChange={(e) => setVariant(i, 'sku', e.target.value)} />
              </label>
              <label>
                <span className="label">{t('productNameFa')}</span>
                <input className="input" value={v.nameFa} onChange={(e) => setVariant(i, 'nameFa', e.target.value)} />
              </label>
              <label>
                <span className="label">{t('variantPrice')}</span>
                <input className="input" dir="ltr" inputMode="numeric" value={v.price} onChange={(e) => setVariant(i, 'price', e.target.value)} />
              </label>
              <label>
                <span className="label">{t('stock')}</span>
                <input className="input" dir="ltr" inputMode="numeric" value={v.stock} onChange={(e) => setVariant(i, 'stock', e.target.value)} />
              </label>
              <button
                className="btn-ghost py-2 text-rose-600"
                onClick={() => setVariants((vs) => vs.filter((_, x) => x !== i))}
                disabled={variants.length === 1}
              >
                {tc('delete')}
              </button>
            </div>
          ))}
          <button className="btn-ghost" onClick={() => setVariants((vs) => [...vs, { sku: '', nameFa: '', nameEn: '', price: '', stock: '0' }])}>
            + {t('addVariant')}
          </button>
        </section>
      </div>

      <aside className="card h-fit space-y-4 p-5">
        <label className="block">
          <span className="label">{t('basePrice')} *</span>
          <input className="input" dir="ltr" inputMode="numeric" value={form.basePrice} onChange={set('basePrice')} />
        </label>
        <label className="block">
          <span className="label">{t('category')} *</span>
          <select className="input" value={form.categoryId} onChange={set('categoryId')}>
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{locale === 'fa' ? c.nameFa : c.nameEn}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">{t('brand')}</span>
          <select className="input" value={form.brandId} onChange={set('brandId')}>
            <option value="">—</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{locale === 'fa' ? b.nameFa : b.nameEn}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">{t('images')}</span>
          <textarea className="input min-h-24" dir="ltr" value={form.images} onChange={set('images')} />
        </label>
        <label className="block">
          <span className="label">{t('status')}</span>
          <select className="input" value={form.status} onChange={set('status')}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DRAFT">DRAFT</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
          />
          {t('featured')}
        </label>

        <button className="btn-primary w-full py-3" onClick={submit} disabled={saving}>
          {saving ? tc('loading') : t('saveProduct')}
        </button>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </aside>
    </div>
  );
}
