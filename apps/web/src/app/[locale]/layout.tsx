import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { direction, locales, type Locale } from '@/i18n/settings';
import { MallProvider } from '@/lib/store';
import '../globals.css';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: {
    default: 'مهرپوشش | MehrWearingShop',
    template: '%s | مهرپوشش',
  },
  description:
    'فروشگاه اینترنتی پوشاک مردانه مهرپوشش — پیراهن، تی‌شرت، شلوار، کفش و اکسسوری مردانه با ضمانت اصالت و تعویض رایگان سایز',
};

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!(locales as readonly string[]).includes(locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} dir={direction[locale as Locale]}>
      <head>
        {/* Webfonts loaded from CDN so builds stay offline-friendly. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700;800&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans">
        <NextIntlClientProvider messages={messages}>
          <MallProvider>{children}</MallProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
