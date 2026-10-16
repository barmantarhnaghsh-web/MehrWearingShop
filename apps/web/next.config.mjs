import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Where the REST API lives, for server-side proxying and SSR fetches.
 * In docker-compose this becomes http://api:4000.
 */
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:4000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // The API (swagger at /api/docs → /api/docs/) uses trailing-slash
  // redirects; Next's own canonical redirect would loop with them, so let the
  // rewrite proxy handle both forms untouched.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    // Same-origin API: the browser calls /api/* on this host and Next proxies
    // to the API service. No CORS needed in the web app, and previews work
    // from any hostname (browser-side localhost would point at the visitor's
    // own machine, not the server).
    //
    // `/api/docs/` must be listed first and keep its trailing slash: the
    // generic pattern drops it, which makes swagger's own add-slash redirect
    // loop forever.
    return [
      { source: '/api/docs/', destination: `${API_PROXY_TARGET}/api/docs/` },
      { source: '/api/:path*', destination: `${API_PROXY_TARGET}/api/:path*` },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default withNextIntl(nextConfig);
