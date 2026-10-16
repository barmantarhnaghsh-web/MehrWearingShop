# Connecting a Mobile / Desktop Client to MehrWearingShop

MehrWearingShop is built **API-first**: the website is one client among many.
A native mobile (React Native / Kotlin / Swift) or desktop (Electron / Tauri /
Flutter) app talks to the same REST API with the same OpenAPI contract.

```
Mobile app ──┐
Desktop app ─┼──►  /api/v1  (same auth, cart, orders, payments)
Web app    ──┘
```

## 1. Discover the contract

```http
GET /api/openapi.json     # OpenAPI 3.0 — generate typed clients:
```

```bash
npx openapi-typescript-codegen --input http://localhost:4000/api/openapi.json --output ./sdk
# or:  orval / openapi-generator (Kotlin, Swift, Dart…)
```

## 2. Base rules

| Item | Value |
|---|---|
| Base URL | `https://api.<your-domain>/api/v1` |
| Content type | `application/json` (UTF-8) |
| Money | integer **Toman** → format with `Intl.NumberFormat(locale)` |
| Locale | request `Accept-Language` is optional; product DTOs include **both** `nameFa`/`nameEn`, `descriptionFa`/`descriptionEn` — pick client-side |
| Images | absolute HTTPS URLs in `images[]` — load directly with your image library |
| Errors | always `{ error: { code, message, details? } }` — map `code`, show localized text |

## 3. Authentication

### Register / login
```http
POST /auth/login
{ "email": "user@example.com", "password": "Secret123!" }

200 OK
{ "data": {
    "user": { "id": "…", "role": "CUSTOMER", … },
    "tokens": { "accessToken": "eyJhbG…", "refreshToken": "9f3c…", "expiresIn": "15m" } } }
```

Store both tokens in **secure storage** (Keychain / Keystore / encrypted prefs —
not plain SharedPreferences).

### Authenticated calls
```http
GET /orders
Authorization: Bearer eyJhbG…
```

### Refresh on `401` (single-flight)
```ts
// pseudocode — mirror of apps/web/src/lib/api.ts
async function request(path, opts) {
  let res = await fetch(BASE + path, { ...opts, headers: authHeaders(opts) });
  if (res.status === 401 && !opts.retried) {
    const tokens = await refresh();          // POST /auth/refresh { refreshToken }
    if (tokens) res = await fetch(BASE + path, { ...opts, headers: authHeaders(opts) });
    else await logoutLocally();
  }
  return parse(res);
}

// POST /auth/refresh → { accessToken, refreshToken }  (old refreshToken is revoked;
// reuse of a revoked token kills the session — that's intentional)
```

### Phone OTP (Iranian UX)
```http
POST /auth/otp/request   { "phone": "09121234567" }   → { data: { expiresInSec: 120 } }
POST /auth/otp/verify    { "phone": "09121234567", "code": "12345" } → session
```
> Dev servers return `devCode` in the response body. In production replace
> `auth.service.ts → requestOtp` with a Kavenegar/SMS.ir call.

## 4. Guest → member cart (critical UX)

```ts
const cartId = await SecureStore.get('cartId') ?? uuid();
api.get('/cart', { headers: { 'x-cart-id': cartId } });
api.post('/cart/items', { variantId, quantity }, { headers: { 'x-cart-id': cartId } });
```
On register/login keep sending `x-cart-id` — the server **merges** the guest cart
into the new account automatically.

## 5. Typical shopping flow

```ts
// 1. browse
const { data: products, meta } = await api.get(
  '/products?category=mobile&sort=price-asc&page=1&limit=12');

// 2. detail
const { data: p } = await api.get(`/products/${slug}`);
const variant = p.variants[0];

// 3. cart
await api.post('/cart/items', { variantId: variant.id, quantity: 1 },
               { headers: { 'x-cart-id': cartId } });
await api.put('/cart/coupon', { code: 'WELCOME10' });   // optional

// 4. checkout
const { data: order } = await api.post('/checkout/orders', {
  addressId: savedAddressId,          // or inline { address: {...} }
  gateway: 'zarinpal',                // 'mock' for dev builds, 'cod' supported
}, { auth: true });

// 5. pay — open paymentUrl in an in-app browser / Custom Tab
if (order.paymentUrl) openInAppBrowser(order.paymentUrl);

// 6. deep-link back to the app
//    zarinpal callback → https://api…/payments/zarinpal/callback
//    server 302 → WEB_PUBLIC_URL/fa/checkout/success?order=MWR-XXXXXX
//    register a universal link / app link on that path in your mobile app,
//    then confirm status client-side:
const { data: status } = await api.get(`/orders/public/${order.orderNumber}`);
```

**Order deep links:** `myapp://orders/MWR-8F3K2Q` works too — read the
`orderNumber` from the redirect URL and fetch `/orders/:id`.

## 6. Desktop clients

Identical protocol. Recommended extras:
- keep tokens in the OS keychain (Electron `safeStorage`, Tauri keyring)
- use the same `x-cart-id` per machine
- poll `GET /orders/:id` (or subscribe to a future WS channel) for status updates

## 7. Admin from your client

Login with an `ADMIN` account and call `/admin/*` endpoints — the mobile app can
ship an admin section with zero extra backend work (403 for customers).

## 8. Local development against the API

```bash
# API only (skip the web app)
docker compose up -d db
npm run dev:api            # http://localhost:4000/api/v1
# emulator/device: use http://10.0.2.2:4000 (Android) or http://localhost:4000 (iOS sim)
```

## 9. Hardening checklist for production clients

- [ ] certificate pinning for your API domain
- [ ] tokens in Keychain/Keystore only; lock refresh behind biometrics if desired
- [ ] `x-cart-id` regenerated per install, wiped on logout
- [ ] handle `429 RATE_LIMITED` with backoff
- [ ] localized strings for every `error.code`
- [ ] verify payment status from the API — never trust the redirect alone
