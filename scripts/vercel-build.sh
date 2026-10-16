#!/usr/bin/env bash
# Demo deployment build: migrate the demo database, load fictional data, then build.
set -euo pipefail
export DIRECT_URL="${DIRECT_URL:-${DATABASE_URL_UNPOOLED:-${POSTGRES_URL_NON_POOLING:-}}}"
npx prisma generate
npx prisma migrate deploy
npx tsx prisma/seed.ts
npx tsx scripts/seed-demo.ts
npm run build
