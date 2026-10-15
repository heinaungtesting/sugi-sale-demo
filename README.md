# Sugi Sale Logger — Demo

A demo deployment of **Sugi Sale Logger**, a mobile-first web app for logging product sales and calculating staff points, built to replace paper-and-calculator tracking at a retail store.

> All products, point values, staff accounts and sales in this demo are **fictional**. The production app and its data are private.

- Demo login: User ID `demo` / PIN `123456`
- Stack: Next.js, React, TypeScript, PostgreSQL, Prisma, IndexedDB (offline queue), Vitest

## What to try

1. Log in with the demo account.
2. Search or tap a product to log a sale. Points are calculated automatically.
3. Check today's list and the history views.
4. Turn on airplane mode and log a sale. It is saved offline and synced when the connection returns. Idempotency keys prevent double registration.

## Demo-specific differences

- The product search uses substring and `pg_trgm` matching instead of PGroonga, because the demo database does not provide PGroonga.
- The build (`scripts/vercel-build.sh`) applies migrations, loads the fictional catalog (`data/local-product-catalog.json`) and creates demo users with sample history (`scripts/seed-demo.ts`).

## Environment variables

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled PostgreSQL URL (runtime) |
| `DATABASE_URL_UNPOOLED` / `DIRECT_URL` | Direct URL for migrations |
| `SUGI_SESSION_SECRET` | Long random secret for session signing |
| `SUGI_COOKIE_SECURE` | `true` on HTTPS |
| `TRUSTED_PROXY` | `true` on Vercel |
| `DEMO_ADMIN_PIN` | Optional: creates a `demo-admin` account |
