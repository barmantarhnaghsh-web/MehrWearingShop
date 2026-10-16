'use client';

import { useTranslations } from 'next-intl';
import { use, useEffect, useState } from 'react';
import { api, ApiResponse } from '@/lib/api';
import { ProductForm } from '@/components/admin/ProductForm';
import type { Product } from '@/lib/types';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    api
      .get<ApiResponse<Product>>(`/admin/products/${id}`, { auth: true })
      .then((res) => setProduct(res.data))
      .catch(() => undefined);
  }, [id]);

  if (!product) return <div className="container-x py-24 text-center text-slate-400">{tc('loading')}</div>;

  return (
    <div className="container-x space-y-6 py-8">
      <h1 className="text-2xl font-extrabold">{t('editProduct')}</h1>
      <ProductForm product={product} />
    </div>
  );
}
