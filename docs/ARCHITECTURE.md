# MehrWearingShop — Architecture

> How the pieces fit together, why they were chosen, and the patterns used across the codebase.

## 1. High-level overview

```
                 ┌────────────────────────────────────────────────────────┐
                 │                     Clients                           │
                 ├──────────────┬───────────────────┬─────────────────────┤
                 │ Web storefront│  Mobile app       │  Desktop app       │
                 │ Next.js 14    │  (React Native…)  │  (Electron/Tauri)  │
                 └───────┬──────┴─────────┬─────────┴──────────┬──────────┘
                         │  HTTPS (JSON)  │                    │
                         ▼                ▼                    ▼
                 ┌────────────────────────────────────────────────────────┐
                 │        MehrWearingShop API   (Express · /api/v1)         │
                 │  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌─────────────┐   │
                 │  │ auth    │ │ catalog  │ │ cart   │ │ orders      │   │
                 │  │ users   │ │ reviews  │ │ coupons│ │ payments    │   │
                 │  │ admin   │ │ wishlist │ │        │ │ (ZarinPal)  │   │
                 │  └─────────┘ └──────────┘ └────────┘ └─────────────┘   │
                 │  Cross-cutting: Zod validation · JWT · rate-limit ·    │
                 │  Helmet · CORS allowlist · pino logs · error envelope  │
                 └───────────────────────────┬────────────────────────────┘
                                             │ Prisma ORM (typed queries,
                                             │  migrations, connection pool)
                                             ▼
                 ┌────────────────────────────────────────────────────────┐
                 │                   PostgreSQL 16                        │
                 │  users · products · variants · carts · orders ·        │
                 │  payments · coupons · reviews · addresses · …          │
                 └────────────────────────────────────────────────────────┘
```

**Headless principle:** the API owns *all* business rules. The web app is just
another API consumer — this is what lets a mobile or desktop app reuse every
feature without duplicating logic.

## 2. Technology decisions

| Concern | Choice | Rationale |
|---|---|---|
| Database | **PostgreSQL** | ACID transactions are non-negotiable for checkout/stock; strong relational integrity for catalog; JSONB for variant attributes; mature full-text options for search growth. (SQL/NoSQL trade-off: commerce data is deeply relational — document stores make order consistency harder.) |
| ORM | Prisma | Type-safe queries shared by services, zero-cost migrations, seeding, works with any Node framework |
| API framework | Express 4 + TS | Simple, portable (any Node host/serverless adapter), enormous middleware ecosystem |
| Validation | Zod | Single source of truth for request shapes; typed outputs replace `req.body` before business logic sees it |
| Auth | JWT (access) + DB-backed rotating refresh tokens | Stateless API auth for mobile; refresh tokens revocable server-side (theft detection via rotation) |
| Money | **Integer Toman** everywhere | No floating point drift; format per-locale at the edge |
| Web | Next.js 14 App Router | Server components for fast catalog pages, ISR-ready, first-class i18n middleware |
| i18n | next-intl, `fa` default | Locale-prefixed URLs (deep-linkable from the app), `dir=rtl` per locale |

## 3. Data model

```
User 1──* Address          User 1──* Order *──1 Coupon
User 1──* RefreshToken     Order 1──* OrderItem *──1 ProductVariant
User 1──0..1 Cart          Order 1──0..1 Payment
User 1──* Review *──1 Product       Product *──1 Category (self-tree)
User 1──* WishlistItem *──1 Product Product 1──* ProductVariant
Cart 1──* CartItem *──1 ProductVariant        Brand 1──* Product
```

Key modelling decisions:

- **`ProductVariant`** holds sku/price/stock per combination (color/size…). A
  product's "price" is `min(active variant prices)`; stock is the sum.
- **Order items are snapshots** (`titleFa/titleEn/sku/unitPrice` copied at
  checkout). Editing or archiving a product never rewrites history.
- **`address` on Order is a JSON snapshot** for the same reason.
- **Stock reservation**: checkout runs in a single transaction —
  `UPDATE … WHERE stock >= qty` per line; a missed reservation aborts the whole
  order. Cancellation (customer or admin) restocks in a transaction.
- **Rating aggregation**: `Product.ratingAvg/ratingCount` are denormalized and
  recomputed on review write — product listings never `AVG()` at read time.
- **Coupon usage**: `usedCount` incremented inside the checkout transaction;
  evaluation rules (`evaluateCoupon`, unit-tested) cover expiry, min-order,
  max-discount and percent/fixed math.
- **Categories** are a self-referencing tree; sub-category pages query the whole
  subtree in one go (`collectSubtreeIds`).

## 4. Request pipeline

```
request
  → helmet → cors(allowlist) → compression → json
  → pino-http (request logging)
  → /api/docs | /api/v1
      → rate-limit → [auth middleware: requireAuth | requireAdmin | optionalAuth]
      → validate(zod schemas)  → controller → service → prisma
  → notFound → errorHandler → { error: { code, message, details? } }
```

Uniform response envelopes:

- success: `{ "data": …, "meta": … }` (`meta` = pagination on lists)
- failure: `{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [...] } }`

Clients switch on `code`, humans read `message` (or the localized equivalent).

## 5. Auth flow

```
POST /auth/login ──► { accessToken (15 min JWT), refreshToken (30 d, sha256-hashed in DB) }

request: Authorization: Bearer <accessToken>
access expired ──► 401 ──► POST /auth/refresh {refreshToken}
      refresh rotates: old token revoked, new pair issued (reuse ⇒ theft signal)
```

- Phone OTP (`/auth/otp/request|verify`) mirrors the Iranian market convention;
  dev mode returns `devCode` in the response — swap the body for an SMS provider
  call in production.
- Guest carts carry a client UUID in `x-cart-id`; `mergeGuestCart` folds the
  guest cart into the account on register/login so no item is ever lost.

## 6. Checkout sequence

```
Client                API                         PostgreSQL
  │ POST /checkout/orders (address)                │
  │────────────────────►│ BEGIN TX                  │
  │                     │ per line: UPDATE variant  │
  │                     │   SET stock=stock-qty     │
  │                     │   WHERE stock >= qty ─────│──► rollback if 0 rows
  │                     │ INSERT order+items+payment│
  │                     │ coupon.usedCount++        │
  │                     │ DELETE cart items         │
  │                     │ COMMIT ◄──────────────────│
  │◄── 201 {order, paymentUrl}                     │
  │ 302 ─► gateway ─► /api/v1/payments/…/callback   │
  │                     │ verify + mark PAID        │
  │◄── redirect /fa/checkout/success?order=MWR-XXXX │
```

## 7. Frontend structure

- `app/[locale]/…` — every route rendered for `fa` (RTL) and `en` (LTR).
- **Server components** fetch the catalog directly from the API (RSC, `no-store`
  for freshness) — pages ship less JS and are SEO-friendly.
- **Client state** (`lib/store.tsx`): a single provider holds session + cart,
  hydrating from localStorage on mount; the API client transparently refreshes
  tokens on 401 and always sends `x-cart-id`.
- Admin pages reuse the same session and call `/admin/*` endpoints; the layout
  redirects non-admins.

## 8. Scaling path

1. **Stateless API** → run N replicas behind a load balancer (JWT needs no session store).
2. **Postgres**: connection pooling (PgBouncer), read replicas for catalog lists.
3. **Redis**: cart/session cache, rate-limit counters, product cache + hot-cache invalidation.
4. **Search**: move `ILIKE` search to PostgreSQL FTS/trigram, then OpenSearch for Persian typo tolerance.
5. **Media**: swap `images[]` URLs to S3/R2 + CDN.
6. **Async**: order emails/notifications via a queue (BullMQ) after checkout.
