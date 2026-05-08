# IPOGyani (Gyani) — PRD

## Project
Next.js 14 IPO tracking platform deployed on Cloudflare Pages + Railway backend scraper.

## Architecture
- **Frontend / SSR**: Next.js 14 (app router) → Cloudflare Pages via `open-next`
- **Database**: Supabase (Postgres) — tables: `ipos`, `gmp_history`, `ipo_gmp`, `subscription_live`, `subscription_history`, `ipo_financials`, `ipo_kpi`, etc.
- **Cron scraper**: Railway service writes to `ipo_gmp` table; Cloudflare Worker calls `/api/cron/dispatch` every 15 min
- **Domain**: guidifyindia.com

## What's Been Implemented

### 2026-05-08 — Fix: Connect Railway ipo_gmp to UI + infra fixes
**PR #2** merged to `main` (SHA: d59ddff)

1. **`lib/supabase/queries.ts`**
   - Added `import { createAdminClient } from './admin'`
   - `getCurrentIPOs()` now fetches Railway `ipo_gmp` table (via admin client, fail-safe) as 4th item in `Promise.all`
   - 3-tier GMP priority: `gmp_history` → `ipos.gmp` (non-zero) → Railway `ipo_gmp`
   - Auto-generates `effectiveSlug` when `slug` column is empty

2. **`cloudflare-worker/wrangler.toml`**
   - `API_BASE_URL` set to `https://guidifyindia.com` (was placeholder)

3. **`wrangler.jsonc`**
   - Removed `global_fetch_strictly_public` from `compatibility_flags` (caused build failures)

## Prioritized Backlog

### P0 (blocking)
- [ ] Deploy Cloudflare cron worker: `npx wrangler secret put CRON_SECRET && npx wrangler deploy` from `cloudflare-worker/`

### P1
- [ ] Verify Railway `ipo_gmp` table has `company_name` matching `ipos.company_name` (case-insensitive)
- [ ] Check `SUPABASE_SERVICE_ROLE_KEY` is set in Cloudflare Pages env vars

### P2
- [ ] Add GMP freshness badge (show Railway scraped_at when used as fallback)
- [ ] Unit tests for `effectiveGmp` fallback logic
