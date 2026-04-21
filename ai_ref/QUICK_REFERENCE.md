# Quick Reference — IPOGyani

> **Last Updated:** 2026-04-18
> The 60-second snapshot. Read `AI_CODEBASE_GUIDE.md` for depth,
> `DATABASE_SCHEMA.md` for SQL details.

---

## One-liner

Next.js 16 (App Router) + Supabase (Postgres, service-role server-side)
+ Upstash Redis (cache / rate limit / circuit breaker) + Vercel Blob
(logos, ML models) + a single Vercel cron that dispatches GMP and
subscription scrapers plus an IST-aware status job every 15 minutes.
Admin auth is **custom** (bcryptjs + JOSE JWT), not Supabase Auth.

---

## Run book

| Task                          | Command                                              |
|-------------------------------|------------------------------------------------------|
| Dev server                    | `npm run dev`                                        |
| Build                         | `npm run build`                                      |
| Lint                          | `npm run lint`                                       |
| Seed default admin            | `node scripts/seed-admin.ts` (or run migration 006)  |
| Fresh DB                      | Run `scripts/007_complete_setup.sql`, then 008–015   |

Package manager: `npm` (there is a `package-lock.json` in the repo root).

---

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY      # server only
JWT_SECRET                     # admin auth
CRON_SECRET                    # /api/cron/* auth
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
BLOB_READ_WRITE_TOKEN          # provisioned by Vercel Blob integration
```

Missing `SUPABASE_SERVICE_ROLE_KEY` → `createAdminClient()` throws.
Calling `createAdminClient()` from a client component → throws.

---

## URL map (abridged)

```
/                       Homepage (RSC)
/upcoming               Upcoming IPOs
/sme                    SME IPOs
/gmp                    GMP tracker
/ipo/[slug]             IPO detail (hybrid: DB + static fallback)
/listed                 Archive index
/listed/[year]          Year archive (ISR, CSV + DB merged)
/listed/[year]/[slug]   Listed IPO detail (ISR)
/subscription-status    Subscription tracker
/allotment-status       Allotment checker
/admin/*                Admin dashboard (requires JWT)
/api/admin/*            Admin API (JWT)
/api/cron/dispatch      Vercel cron (every 15 min)
```

---

## Status lifecycle

```
upcoming → open → lastday → closed → allot → listing → listed
```

Driven by `runAutoStatusJob()` in `app/api/admin/auto-status/route.ts`
every 15 minutes. IST-aware (5pm close cutoff, `Asia/Kolkata`). When a
row moves to `listed`, it's also upserted into `listed_ipos` via
`migrateIpoToListed()`.

---

## Listed IPO archive (important)

- Historical rows: CSVs in `data/listed-ipos/<year>.csv` (~40 columns).
- Fresh rows: `listed_ipos` DB table (populated by migration from `ipos`).
- Pages use **ISR** (`revalidate = 3600`, `dynamicParams = true`).
- Merge order: CSV wins on slug conflict.

Loader API (in `lib/listed-ipos/loader.ts`):

```ts
getMergedListedIposByYear(year)   // merged CSV + DB
getMergedListedIpo(year, slug)
getMergedAvailableYears()
```

On migrate, the API route calls `revalidatePath` on `/listed`,
`/listed/<year>`, and `/listed/<year>/<slug>` (wrapped in try/catch so
cron doesn't fail when there's no request context).

---

## Tech stack (top of mind)

- Next.js 16.2.0, React 19, TypeScript 5.7.3, Tailwind 4.2.0
- `@supabase/supabase-js` ^2.102, `@supabase/ssr` ^0.10
- `@upstash/redis` ^1.37
- `@vercel/blob` ^2.3
- `jose` ^6.2 (JWT), `bcryptjs` ^3.0
- `cheerio` ^1.2, `fast-xml-parser` ^5.6 (scrapers)
- SWR, Recharts, Lucide, Sonner, Zustand, Zod, RHF

Font: **Inter only**, loaded via `next/font/google` in `app/layout.tsx`.

---

## Database gotchas

- **IDs are `SERIAL` integers, not UUIDs.** The old doc was wrong.
  UUID tables are only: `admins`, `expert_reviews`, `reviews`,
  `ipo_news`, `ipo_youtube_summaries`, `ipo_predictions`,
  `ml_model_registry`. Everything else is `SERIAL`.
- **`ipos.abbr` column still exists** but app code doesn't write to it.
  Generate abbreviation from name at render time (`name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()`).
- **TS ↔ DB column mapping** (common):
  - `name` → `company_name`
  - `listDate` → `listing_date`
  - `leadManager` → `brlm`
  - `aboutCompany` → `description`
- **Subscription**: `subscription_live` (current category-wise) and
  `subscription_history` (day-wise) are separate tables (migration 011).

---

## Admin auth

Custom — not Supabase Auth.

- Login: `POST /api/admin/login` with `{ username, password }` → returns JWT.
- Default creds: `admin` / `changeme123` (must reset on first login).
- Token format: JOSE HS256, 15-minute expiry, signed with `JWT_SECRET`.
- Client stores token via `lib/auth-context.tsx`.
- Server middleware gates `/api/admin/*` (JWT) and `/api/cron/*`
  (JWT **or** `CRON_SECRET` header).

If you see `401 Invalid credentials` after changing `JWT_SECRET`,
re-login to get a fresh token.

---

## Cron

Single entry: `/api/cron/dispatch` (Vercel cron `*/15 * * * *`).
Fans out to three jobs in parallel:

1. `runGmpScraper()` — multi-source GMP refresh (active: IPOWatch + ipoji; optional direct URL sources: InvestorGain + IPOCentral when configured).
1. `runGmpScraper()` — multi-source GMP refresh (active: IPOWatch + ipoji; stored/disabled: InvestorGain + IPOCentral).
2. `runSubscriptionScraper()` — NSE / BSE / Chittorgarh.
3. `runAutoStatusJob()` — IST-aware status transitions + day-after listing migration.

Each run is logged to `scraper_health`. Dispatcher logs a summary row.

---

## Scraper layer (`lib/scraper/`)

- `base.ts` — `fetchWithRetry` (3 retries on 5xx/429, 15s timeout),
  `logScraperRun`, cron auth helpers, Redis-backed circuit breaker
  (5 failures in 1 hour → cooldown).
- `sources/` — one file per source, pure parser functions.
- Always call `fetchWithRetry`, never raw `fetch()`.

---

## Admin UI entry points

```
/admin                          Dashboard
/admin/ipos/new                 Create IPO
/admin/ipos/[id]                Full editor (financials, KPI, peers, subscription, reviews, ...)
/admin/ipos/[id]/edit           Minimal edit form
/admin/gmp                      GMP management
/admin/reviews                  Expert reviews
/admin/automation               Scraper health + manual triggers
/admin/settings                 Admin settings
/admin/login, /admin/reset-password
```

---

## Design tokens (excerpt)

```
--primary:      #4F46E5   (Indigo)
--emerald:      #15803D   (positive)
--destructive:  #DC2626   (negative)
--gold:         #B45309   (warning)
--cobalt:       #1D4ED8   (info)
--ink:          #111827
--background:   #F8FAFC
```

Rules: max 5 colors, no purple/violet, no gradients (unless component
already uses one), override text color whenever you override bg.

---

## Common fixes

| Symptom                                             | Fix                                                                           |
|-----------------------------------------------------|-------------------------------------------------------------------------------|
| `PGRST204` "column not found in schema cache"       | `NOTIFY pgrst, 'reload schema';` or click "Reload schema" in Supabase.        |
| `createAdminClient must not be called from a client` | Move code to a route handler / RSC. Service-role key cannot be in browser.   |
| `/listed/<year>` missing a DB-only IPO              | Confirm `listed_ipos.year` or `list_date` is set. ISR refresh is hourly.     |
| Migration didn't appear to the app                  | Confirm migration ran, then reload schema.                                    |
| 401 on `/api/admin/*` after deploy                  | Regenerate `JWT_SECRET` only if you want to force re-login. Otherwise check middleware. |
| Cron firing but no side effects                     | Check `scraper_health` for the latest rows. Check `CRON_SECRET` matches.     |

---

## Do / Don't

**Do:**
- Use `lib/listed-ipos/loader.ts` merged loaders on `/listed/*` pages.
- Use `createAdminClient()` for server-side writes that need to bypass RLS.
- Use `fetchWithRetry` in new scrapers.
- Add new SQL migrations as `scripts/NNN_*.sql` (never mutate existing ones).
- Use the design tokens in `globals.css`.

**Don't:**
- Re-introduce the `abbr` column to app payloads.
- Build new auth on Supabase Auth — the admin JWT path is the standard.
- Fetch inside `useEffect` — use SWR.
- Use localStorage for app data — use Supabase.
- Import `lib/supabase/admin.ts` from a client component.
