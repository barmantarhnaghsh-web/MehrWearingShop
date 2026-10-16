<div dir="rtl">

# مهرپوشش | MehrWearingShop

**یک پلتفرم فروشگاه اینترنتی کامل، دوزبانه (فارسی/انگلیسی)، آماده اتصال اپلیکیشن موبایل و دسکتاپ**

[![CI](https://img.shields.io/badge/CI-GitHub_Actions-2ea44f)](.github/workflows/ci.yml)
![API](https://img.shields.io/badge/API-Express_%2B_OpenAPI-2b6cb0)
![Web](https://img.shields.io/badge/Web-Next.js_14-000000)
![DB](https://img.shields.io/badge/Database-PostgreSQL_16-336791)
![License](https://img.shields.io/badge/License-MIT-yellow)

</div>

---

**MehrWearingShop** is a production-style e-commerce platform built as a **headless API + web storefront** monorepo — exactly the architecture used by Digikala, Amazon and similar platforms that serve a website *and* native mobile/desktop apps from the same backend.

| Layer | Technology | Why |
|---|---|---|
| **API** | Node.js 20 · Express 4 · TypeScript | Mature, battle-tested HTTP layer; first-class JSON APIs for mobile clients |
| **Database** | **PostgreSQL 16** + Prisma ORM | The reference choice for commerce: ACID transactions (stock/checkout), relational integrity, JSONB for flexible attributes, full-text search, scalable to millions of rows |
| **Auth** | JWT access (15 min) + rotating refresh tokens, phone-OTP ready | Stateless for mobile, revocable sessions, Iranian phone-number login |
| **Web** | Next.js 14 (App Router) · React 18 · Tailwind CSS | SSR/SEO for the storefront, fast UX, RSC for catalog pages |
| **i18n** | next-intl — **Persian (default, RTL)** + English | True RTL layout, Persian digits, per-locale URLs (`/fa/…`, `/en/…`) |
| **Payments** | ZarinPal (real) + Mock gateway (demo) + COD | The de-facto Iranian PSP, plus a zero-dependency demo mode |
| **Docs** | OpenAPI 3 + Swagger UI | Machine-readable contract for generating mobile/desktop clients |

<div dir="rtl">

> **چرا PostgreSQL؟** تراکنش‌های اتمیک برای کسر موجودی و ثبت سفارش، یکپارچگی رابطه‌ای (سفارش ← کاربر ← کالا)، پشتیبانی از داده‌های ساختار‌یافته (JSONB) برای مشخصات محصول، و جستجوی متنی فارسی — پایدارترین انتخاب برای فروشگاه اینترنتی.

</div>

## ✨ Features

**Storefront**
- 🏠 Homepage: hero, category grid, featured / new-arrival / best-seller rails
- 🔎 Catalog with search (Persian + English), category & brand filters, price range, rating filter, 5 sort modes, pagination
- 🎨 Product detail: image gallery, **variants** (color/size/storage with per-variant price & stock), specs table, reviews, related products
- 🛒 **Server-side cart** with guest support (`x-cart-id` header), auto-merge on login
- 🎟️ Coupon engine (percent/fixed, min-order, max-discount, expiry, usage limits)
- 🧾 Checkout: saved or inline addresses, shipping rules (free over 500k Toman), order note
- 💳 Payment: **ZarinPal** redirect flow, mock gateway for demo, cash-on-delivery
- 📦 Order history with live status (pending → paid → processing → shipped → delivered), self-cancel with auto-restock
- 💛 Wishlist, ⭐ reviews (one per user, auto rating aggregation), 🔍 header autocomplete
- 👤 Auth: email/password **and** phone OTP (dev mode returns the code; swap in SMS provider for prod)
- 🌐 Full **Persian RTL (default)** + English localisation, Persian digits in prices/dates

**Admin panel** (`/fa/admin`, role-protected)
- 📊 Dashboard: revenue, orders today, low-stock alerts, recent orders, top products
- 📦 Product CRUD with variants, category/brand management
- 🧾 Order workflow with status transitions (cancel ⇒ restock + refund marker)
- 🎟️ Coupon management, 👥 user listing

**Platform**
- 📱 **API-first**: every feature is a documented REST endpoint — the mobile/desktop app is a first-class client
- 📖 Swagger UI at `/api/docs`, OpenAPI JSON at `/api/openapi.json`
- 🔐 Rate limiting, Helmet, CORS allowlist, Zod validation, global error envelope
- 🧪 20 unit tests (pricing, coupons, slugs, pagination) + full smoke-test script
- 🐳 Dockerfiles + docker-compose, GitHub Actions CI, deployment guide

## 📂 Repository layout

```
MehrWearingShop/
├── apps/
│   ├── api/                 # Express + Prisma REST API
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # Database schema (source of truth)
│   │   │   ├── migrations/        # Versioned SQL migrations
│   │   │   └── seed.ts            # Demo catalog + admin account
│   │   └── src/
│   │       ├── config/            # Env validation (Zod)
│   │       ├── lib/               # Prisma, money math, slugs, pagination
│   │       ├── middleware/        # auth (JWT), rate-limit, errors, validation
│   │       ├── modules/           # auth, catalog, cart, orders, payments, …
│   │       └── openapi/           # OpenAPI contract served at /api/docs
│   └── web/                 # Next.js 14 storefront + admin UI
│       └── src/
│           ├── app/[locale]/      # fa (RTL) & en routes
│           ├── components/        # Header, ProductCard, admin forms…
│           ├── lib/               # API client, session store, formatters
│           ├── messages/          # fa.json / en.json (228 keys, parity-checked)
│           └── middleware.ts      # next-intl locale routing
├── docs/
│   ├── ARCHITECTURE.md      # System design, data model, patterns
│   ├── DEPLOYMENT.md        # From localhost to production (Docker/VPS/cloud)
│   ├── MOBILE_INTEGRATION.md# How to connect a mobile/desktop app
│   └── API.md               # Endpoint reference + auth walkthrough
├── docker-compose.yml       # postgres + api + web
└── .github/workflows/ci.yml # Typecheck, tests, build
```

## 🚀 Quick start (local)

**Requirements:** Node ≥ 20.9, npm ≥ 10, PostgreSQL 16 (or use Docker).

```bash
# 1. install
git clone <repo-url> && cd MehrWearingShop
npm install

# 2. environment
cp .env.example .env
cp apps/api/.env.example apps/api/.env       # then edit DATABASE_URL

# 3. database (needs a running PostgreSQL)
createdb mwrshop                              # or: docker compose up -d db
npm run db:migrate -w @mwr/api                # apply migrations
npm run db:seed -w @mwr/api                   # demo catalog + admin

# 4. run both apps (API :4000, web :3000)
npm run dev:api
npm run dev:web                               # in a second terminal
```

Open **http://localhost:3000/fa** — API docs at **http://localhost:4000/api/docs**

<details>
<summary><b>🐳 Or everything with Docker (recommended)</b></summary>

```bash
cp .env.example .env       # set JWT secrets first!
docker compose up --build
# web  → http://localhost:3000
# api  → http://localhost:4000/api/docs
```
</details>

<details>
<summary><b>🔑 Demo accounts (seeded)</b></summary>

| Role | Email | Password |
|---|---|---|
| Admin | `admin@mwrshop.ir` | `Admin@1234` |
| Customer | `demo@mwrshop.ir` | `Demo@1234` |

Coupons: `WELCOME10` (10% ≤ 200k Toman) · `MEHR500` (500k off ≥ 2M Toman)
</details>

## 🧪 Verification

```bash
npm run typecheck      # tsc across api + web
npm run test           # vitest unit tests (pricing, coupons, pagination…)
npm run build          # production builds of both apps
```

## 📱 Mobile & desktop clients

The API is the product surface for every client:

- Base URL: `http(s)://<host>/api/v1` · contract: `GET /api/openapi.json`
- Login returns `accessToken` (15 min) + `refreshToken` (30 d) → send `Authorization: Bearer …`
- Guest carts work with a client-generated UUID in `x-cart-id`; merged on login
- Money is integer **Toman**; localize digits client-side

Full walkthrough (request/response samples, refresh flow, deep links):
**[docs/MOBILE_INTEGRATION.md](docs/MOBILE_INTEGRATION.md)**

## 🚢 Deployment

Step-by-step production guide (Docker Compose on a VPS, managed Postgres, HTTPS,
env vars checklist, migrations, health checks, CI):
**[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**

## 📖 Documentation

| Doc | Contents |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System diagram, data model, key patterns |
| [docs/API.md](docs/API.md) | Endpoint tables, auth, error envelope |
| [docs/MOBILE_INTEGRATION.md](docs/MOBILE_INTEGRATION.md) | Client integration guide |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment |
| `/api/docs` | Live Swagger UI |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Dev workflow & conventions |

## 🗺️ Roadmap

- [ ] Elasticsearch/OpenSearch for typo-tolerant Persian search at scale
- [ ] Redis: cart cache, rate-limit store, product cache
- [ ] Real SMS provider (Kavenegar) for OTP
- [ ] Inventory per-warehouse, shipping cost calculator by weight/zone
- [ ] React Native app consuming `/api/v1` (see MOBILE_INTEGRATION.md)
- [ ] WebSocket order-status push + push notifications

## 📄 License

MIT — see [LICENSE](LICENSE).
