import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from './settings';

export default getRequestConfig(async ({ locale }) => {
  const safeLocale = (locales as readonly string[]).includes(locale) ? locale : defaultLocale;
  return {
    locale: safeLocale,
    messages: (await import(`../messages/${safeLocale}.json`)).default,
  };
});
