'use client';

import { useTranslations } from 'next-intl';
import { ProductForm } from '@/components/admin/ProductForm';

export default function NewProductPage() {
  const t = useTranslations('admin');
  return (
    <div className="container-x space-y-6 py-8">
      <h1 className="text-2xl font-extrabold">{t('newProduct')}</h1>
      <ProductForm />
    </div>
  );
}
