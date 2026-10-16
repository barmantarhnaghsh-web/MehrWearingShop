import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['fa', 'en'],
  defaultLocale: 'fa',
  // Always-visible locale segment keeps URLs predictable for mobile deep links.
  localePrefix: 'always',
});

export const { locales, defaultLocale, localePrefix } = routing;
