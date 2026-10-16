# MehrWearingShop API Reference

Base URL: `http(s)://<host>/api/v1`
Interactive docs: **`/api/docs`** (Swagger UI) · machine contract: **`/api/openapi.json`**

## Conventions

| Topic | Rule |
|---|---|
| Responses | Success `{ "data": … }` (+ `"meta"` pagination on lists) · Error `{ "error": { code, message, details? } }` |
| Money | Integer **Toman** (e.g. `72500000`) |
| Pagination | `?page=1&limit=12` (limit max 50) → `meta: { page, limit, total, totalPages, hasNext, hasPrev }` |
| Auth | `Authorization: Bearer <accessToken>` (JWT, 15 min) |
| Guest cart | Send `x-cart-id: <uuid>` on cart/auth endpoints |
| Rate limit | 300 req/min general · 30 req/15 min on auth (`429 RATE_LIMITED`) |

**Error codes:** `VALIDATION_ERROR` (400) · `UNAUTHORIZED` (401) · `FORBIDDEN` (403) · `NOT_FOUND` (404) · `CONFLICT` (409) · `UNPROCESSABLE_ENTITY` (422) · `RATE_LIMITED` (429) · `INTERNAL_ERROR` (500)

## Endpoints

### Health
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | DB + uptime probe (`200 ok` / `503 degraded`) |

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Create account (+ merge guest cart) → `{user, tokens}` |
| POST | `/auth/login` | — | Email + password → `{user, tokens}` |
| POST | `/auth/refresh` | — | Rotate refresh token → new pair |
| POST | `/auth/logout` | — | Revoke refresh token |
| POST | `/auth/otp/request` | — | Send phone OTP (dev: returns `devCode`) |
| POST | `/auth/otp/verify` | — | Verify OTP → session (auto-registers new numbers) |

```jsonc
// POST /auth/login
{ "email": "demo@mwrshop.ir", "password": "Demo@1234" }
// → 200
{ "data": { "user": { "id": "…", "role": "CUSTOMER", "firstName": "سارا", … },
            "tokens": { "accessToken": "eyJ…", "refreshToken": "ab12…", "expiresIn": "15m" } } }
```

### Users
| Method | Path | Auth | Description |
|---|---|---|---|
| GET / PATCH | `/me` | user | Read / update profile |
| GET / POST | `/me/addresses` | user | List / create addresses |
| PATCH / DELETE | `/me/addresses/:id` | user | Update / delete address |

### Catalog (public)
| Method | Path | Description |
|---|---|---|
| GET | `/categories` | Navigation tree with product counts |
| GET | `/categories/:slug?` | Category + paginated products (subtree included) |
| GET | `/brands` · `/brands/:slug` | Brand list / brand products |
| GET | `/products` | **Search & filter**: `q, category, brand, minPrice, maxPrice, minRating, sort(newest\|price-asc\|price-desc\|bestselling\|rating), page, limit` |
| GET | `/products/:slug` | Detail with active variants |
| GET | `/products/:slug/related` | Same-category alternatives |
| GET | `/search/suggest?q=` | Header autocomplete (min 2 chars) |

`Product` highlights: `minPrice`, `stock`, `ratingAvg`, `ratingCount`, `soldCount`,
`images[]`, `category`, `brand`, `variants[]` (`{ id, sku, nameFa, nameEn, price?, stock, attributes }`).

### Cart
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/cart` | optional | Cart + computed `totals` |
| POST | `/cart/items` | optional | `{ variantId, quantity }` → upsert |
| PATCH | `/cart/items/:variantId` | optional | `{ quantity }` (0 = remove) |
| DELETE | `/cart/items/:variantId` · `/cart` | optional | Remove item / empty cart |
| PUT | `/cart/coupon` | optional | `{ code \| null }` apply/remove coupon |

`totals = { subtotal, discount, shippingCost, total, couponCode }` —
free shipping ≥ 500,000 Toman, otherwise 35,000 Toman.

### Orders & payments
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/checkout/orders` | user | Cart → order (reserves stock). Body: `{ address \| addressId, note?, gateway?: mock\|zarinpal\|cod }` → `{ …order, paymentUrl }` |
| GET | `/orders` · `/orders/:id` | user | My orders / detail (`:id` = id **or** order number) |
| POST | `/orders/:id/cancel` | user | Cancel pending order (restocks) |
| GET | `/orders/public/:orderNumber` | — | Thank-you page summary |
| GET | `/payments/mock/:id` | — | Demo gateway page (confirm/fail buttons) |
| GET | `/payments/zarinpal/callback` | — | PSP redirect target (`?Authority&Status`) |
| POST | `/payments/:id/refund` | admin | Mark refund |

Order status machine:
```
PENDING ──pay──► PAID ──► PROCESSING ──► SHIPPED ──► DELIVERED
   │                └──────────┴──────────┴── cancel ──► CANCELLED (restock + refund marker)
```

### Reviews & wishlist
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/products/:slug/reviews` | — | Approved reviews (paginated) |
| POST | `/products/:slug/reviews` | user | `{ rating 1-5, title?, body }` (one per user → `409`) |
| GET | `/reviews` | user | Own reviews with product refs (paginated) |
| DELETE | `/reviews/:id` | user | Remove own review |
| GET / POST / DELETE | `/wishlist[/:productId]` | user | List / add (idempotent) / remove |

### Coupons
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/coupons/check` | — | `{ code, subtotal }` → discount preview or `422` |

### Admin (`role: ADMIN` → else `403`)
| Method | Path | Description |
|---|---|---|
| GET | `/admin/stats` | KPIs, recent orders, top products |
| GET/POST | `/admin/products` | List (any status) / create with variants |
| GET/PATCH/DELETE | `/admin/products/:id` | Detail / update / archive |
| POST | `/admin/products/:id/variants` · PATCH `/admin/variants/:id` | Variant management |
| GET/POST | `/admin/categories` · PATCH/DELETE `/admin/categories/:id` | Category tree admin |
| GET/POST | `/admin/brands` | Brand admin |
| GET | `/admin/orders?status=&q=` | All orders |
| PATCH | `/admin/orders/:id/status` | Status transition (cancel restocks) |
| GET/POST | `/admin/coupons` · PATCH/DELETE `/admin/coupons/:code` | Coupon lifecycle |
| GET | `/admin/users` | Users + order counts |

## Postman/curl example

```bash
TOKEN=$(curl -s -X POST $API/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@mwrshop.ir","password":"Demo@1234"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["tokens"]["accessToken"])')

curl -s $API/products?limit=3 -H "Authorization: Bearer $TOKEN" | jq
```
