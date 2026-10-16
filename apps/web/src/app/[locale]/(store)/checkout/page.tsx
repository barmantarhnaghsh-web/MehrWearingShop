import { setRequestLocale } from 'next-intl/server';
import { CheckoutView } from './CheckoutClient';

// Session/cart pages are always rendered per request.
export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  return <CheckoutView />;
}
