# Deploying MehrWearingShop

Three supported paths: **Docker Compose on a VPS** (recommended, cheapest,
full control), **managed containers** (Railway/Render/Cloud Run), or
**split hosting** (static web + API on any Node host + managed Postgres).

---

## 0. Pre-flight checklist

- [ ] Domain names: `shop.example.com` (web) + `api.example.com` (API)
- [ ] PostgreSQL 16 reachable from the API host
- [ ] Secrets generated: `openssl rand -hex 32` for **both** JWT secrets
- [ ] ZarinPal merchant id (or keep `PAYMENT_PROVIDER=mock` for a demo)

### Environment variables

| Variable | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | api | `postgresql://user:pass@host:5432/mwrshop?schema=public` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | api | ≥ 32 chars random; rotating them logs everyone out |
| `ACCESS_TOKEN_TTL` / `REFRESH_TOKEN_TTL_DAYS` | api | defaults `15m` / `30` |
| `CORS_ORIGIN` | api | comma-separated allowlist, e.g. `https://shop.example.com` |
| `API_PUBLIC_URL` | api | public base of API (payment callbacks) |
| `WEB_PUBLIC_URL` | api | public base of web (post-payment redirects) |
| `PAYMENT_PROVIDER` | api | `zarinpal` \| `mock` \| `cod` |
| `ZARINPAL_MERCHANT_ID` / `ZARINPAL_SANDBOX` | api | sandbox `false` in production |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_PHONE` | api seed | initial admin login |
| `NEXT_PUBLIC_API_URL` | web (**build time!**) | default `/api/v1` (same-origin, proxied by Next); set an absolute URL like `https://api.example.com/api/v1` only for split-origin setups |
| `API_PROXY_TARGET` | web (runtime) | where the Next `/api/*` proxy and SSR fetches go; compose default `http://api:4000`, bare-metal default `http://127.0.0.1:4000` |

> `NEXT_PUBLIC_*` is inlined at **build** time — changing it requires a web rebuild.

---

## 1. Docker Compose on a VPS (recommended)

```bash
# on the server (Ubuntu 22.04+)
git clone <repo-url> && cd MehrWearingShop
cp .env.example .env
nano .env                 # set JWT secrets, domains, payment provider
docker compose up -d --build
docker compose exec api npx prisma migrate deploy   # first run / schema updates
docker compose exec api npm run db:seed             # optional demo data
docker compose ps                                    # all services healthy?
```

Services: `db` (Postgres 16, volume `pgdata`) · `api` (:4000, runs migrations on boot) · `web` (:3000, standalone Next build).

### HTTPS with Caddy (2 lines)

```
shop.example.com {
  reverse_proxy localhost:3000
}
```
```bash
sudo apt install caddy && sudo systemctl reload caddy   # auto-TLS via Let's Encrypt
```
One domain is enough: the web app proxies `/api/*` to the API container
(`API_PROXY_TARGET`), so there is no CORS and payment redirects keep working.
Set `API_PUBLIC_URL=https://shop.example.com` and
`WEB_PUBLIC_URL=https://shop.example.com` in `.env`.

<details>
<summary>Split-origin alternative (separate API subdomain)</summary>

```
shop.example.com {
  reverse_proxy localhost:3000
}
api.example.com {
  reverse_proxy localhost:4000
}
```
Then set `CORS_ORIGIN=https://shop.example.com`,
`API_PUBLIC_URL=https://api.example.com`, `WEB_PUBLIC_URL=https://shop.example.com`,
`NEXT_PUBLIC_API_URL=https://api.example.com/api/v1` and rebuild web.
</details>

### Updates

```bash
git pull
docker compose up -d --build
docker compose exec api npx prisma migrate deploy
```

### Backups

```bash
docker compose exec db pg_dump -U mwr mwrshop | gzip > backup_$(date +%F).sql.gz
# restore: gunzip -c backup.sql.gz | docker compose exec -T db psql -U mwr mwrshop
```
Cron example (nightly 03:00): add to `crontab -e`.

---

## 2. Managed containers

**Railway / Render / Cloud Run (API):**
1. New service → this repo, root `apps/api`, Dockerfile detected.
2. Set the env vars from the table; `DATABASE_URL` → your managed Postgres
   (Railway/Neon/Supabase/RDS).
3. Build command stays `npm run build`; start `npm start`
   (the image already runs `prisma migrate deploy` on start).
4. Bind a public domain → set `API_PUBLIC_URL`/`WEB_PUBLIC_URL`; for split domains also `CORS_ORIGIN`.

**Web (Vercel / Netlify / Node host):**
1. Root directory `apps/framework`, framework preset **Next.js**.
2. Build env: default `/api/v1` works when `API_PROXY_TARGET` can reach the API
   (set it to the API's public URL); for a separate API host set
   `NEXT_PUBLIC_API_URL=https://api.example.com/api/v1` instead.
3. Deploy → attach `shop.example.com`.
4. **Vercel note:** set `output: 'standalone'` aside is fine; no special config needed.

Split hosting is fully supported — CORS + the two public URLs are the only glue.

---

## 3. Bare VM (no Docker)

```bash
# deps
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash - && sudo apt install -y nodejs
sudo apt install -y postgresql nginx

# db
sudo -u postgres createuser mwr --pwprompt
sudo -u postgres createdb mwrshop -O mwr

# app
git clone <repo-url> && cd MehrWearingShop && npm install
cp .env.example .env && cp apps/api/.env.example apps/api/.env  # edit values
npm run build
npm run db:migrate -w @mwr/api

# process manager
sudo npm install -g pm2
pm2 start apps/api/dist/main.js --name mwr-api
pm2 start "npx next start -p 3000" --name mwr-web --cwd apps/web
pm2 save && pm2 startup
```
Terminate TLS + proxy with Caddy/Nginx as above.

---

## 4. Post-deploy verification

```bash
curl -fsS https://api.example.com/api/v1/health          # {"status":"ok","db":"up"}
open https://api.example.com/api/docs                     # Swagger UI loads
open https://shop.example.com/fa                          # Persian RTL storefront
# purchase flow: register → add to cart → checkout → gateway → success page
# admin: login admin@… → /fa/admin → order status changes
```

- [ ] `health` reports `db: up`
- [ ] Swagger UI renders, `openapi.json` returns 200
- [ ] fa (RTL) and en (LTR) both render, prices in Persian digits on `/fa`
- [ ] full checkout completes (mock provider is enough to validate plumbing)
- [ ] non-admin gets `403` on `/admin/stats`
- [ ] logs flowing (`docker compose logs -f api` / `pm2 logs mwr-api`)

## 5. Operations

| Task | Command |
|---|---|
| Schema change | edit `prisma/schema.prisma` → `npx prisma migrate dev --name x` locally → commit `prisma/migrations` → `migrate deploy` in prod |
| Rotate JWT secrets | set new values, restart API (all sessions invalidated) |
| Watch logs | `docker compose logs -f api web` |
| Disk/DB growth | `SELECT count(*) FROM orders;` + enable backups before launch |

## 6. Production hardening (before real traffic)

1. Strong `JWT_*` secrets & admin password; `ZARINPAL_SANDBOX=false`.
2. Postgres: private network, `pg_dump` cron, connection pooler (PgBouncer).
3. Rate limit values tuned (`middleware/rate-limit.ts`) + fail2ban/nginx limits.
4. CDN for images; `images.remotePatterns` updated to your media bucket.
5. Monitoring: uptime check on `/health`, error tracking (Sentry), log shipping.
6. `docker compose` behind a firewall — only 80/443 public; Postgres not exposed.
