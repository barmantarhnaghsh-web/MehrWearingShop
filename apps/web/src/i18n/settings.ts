export const locales = ['fa', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'fa';
export const localeNames: Record<Locale, string> = { fa: 'فارسی', en: 'English' };
export const direction: Record<Locale, 'rtl' | 'ltr'> = { fa: 'rtl', en: 'ltr' };
