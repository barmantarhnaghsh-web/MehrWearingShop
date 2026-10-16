# Contributing to MehrWearingShop

Thanks for helping! This repo is a pnpm-agnostic **npm workspaces** monorepo.

## Setup

```bash
npm install
cp apps/api/.env.example apps/api/.env     # point DATABASE_URL at a Postgres
npm run db:migrate -w @mwr/api && npm run db:seed -w @mwr/api
npm run dev:api      # :4000
npm run dev:web      # :3000
```

## Workflow

1. Branch from `main`: `feature/<short-name>` or `fix/<short-name>`.
2. Make the change with tests.
3. Verify before pushing:

```bash
npm run typecheck   # tsc in both apps
npm run test        # vitest
npm run build       # production builds
```

4. Open a PR with: what changed, why, screenshots (UI), and how it was tested.

## Conventions

- **TypeScript strict** — no `any` in service/controller code; prefer narrow types.
- **Money** is integer Toman; never floats.
- **Validation** at the edge: extend the Zod schema in `*.dto.ts` / router `validate({ body })`.
- **API responses** use `{ data }` / `{ error: { code, message } }` envelopes — add
  new fields to the OpenAPI document in `apps/api/src/openapi/paths.ts`.
- **i18n**: add every new UI string to **both** `apps/web/src/messages/fa.json`
  and `en.json` (key parity is checked in review; Persian is the default locale,
  keep it natural, not literal).
- **RTL**: use logical classes (`ms-/me-/start-/end-`) instead of `left-/right-`.
- **PRs** keep migrations additive; never edit an applied migration — create a new one.
- Commit style: `feat(cart): …`, `fix(auth): …`, `docs: …`.

## Project structure

See [README.md](README.md#-repository-layout). Business logic lives in
`apps/api/src/modules/*`; keep controllers thin and services testable/pure where
possible (see `lib/money.ts` + `src/__tests__/` for the pattern).
