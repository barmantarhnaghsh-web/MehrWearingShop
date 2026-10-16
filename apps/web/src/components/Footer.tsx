import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useLocale } from 'next-intl';

export function Footer() {
  const t = useTranslations('footer');
  const tn = useTranslations('nav');
  const locale = useLocale();

  return (
    <footer className="mt-16 border-t border-brand-800 bg-brand-950 text-brand-200">
      <div className="container-x grid gap-10 py-12 md:grid-cols-3">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-camel-500 font-display text-lg font-bold text-brand-950">م</span>
            <h3 className="font-display text-lg font-bold text-white">{t('aboutTitle')}</h3>
          </div>
          <p className="text-sm leading-7 text-brand-300">{t('aboutBody')}</p>
        </div>
        <div>
          <h3 className="mb-3 text-lg font-bold text-white">{t('linksTitle')}</h3>
          <ul className="space-y-2 text-sm text-brand-300">
            <li><Link href={`/${locale}/catalog`} className="hover:text-camel-400">{tn('catalog')}</Link></li>
            <li><Link href={`/${locale}/catalog?sort=newest`} className="hover:text-camel-400">{tn('newArrivals')}</Link></li>
            <li><Link href={`/${locale}/account`} className="hover:text-camel-400">{tn('orders')}</Link></li>
            <li><Link href={`/${locale}/account/wishlist`} className="hover:text-camel-400">{tn('wishlist')}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-lg font-bold text-white">{t('contactTitle')}</h3>
          <ul className="space-y-2 text-sm text-brand-300">
            <li>{t('support')}</li>
            <li>{t('address')}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-brand-800 py-4 text-center text-xs text-brand-500">{t('rights')}</div>
    </footer>
  );
}
