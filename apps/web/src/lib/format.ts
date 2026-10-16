/** Format money using the app locale (Persian digits for fa). */
export function formatPrice(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US').format(amount);
}

export function formatDate(iso: string | Date, locale: string): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/** Pick the localized field of a bilingual API object (null-safe). */
export function pick(obj: { nameFa?: string | null; nameEn?: string | null }, locale: string): string {
  return (locale === 'fa' ? obj.nameFa : obj.nameEn) ?? obj.nameEn ?? obj.nameFa ?? '';
}
