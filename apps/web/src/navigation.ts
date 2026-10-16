import { createNavigation } from 'next-intl/navigation';
import { defaultLocale, localePrefix, locales } from './i18n/routing';

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation({
  locales,
  defaultLocale,
  localePrefix,
});
