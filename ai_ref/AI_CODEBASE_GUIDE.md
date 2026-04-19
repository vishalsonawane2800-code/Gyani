# IPOGyani - AI Agent Codebase Guide

> **Last Updated:** 2026-04-18
> **Purpose:** Single source of truth for AI agents (and humans) working on
> the IPOGyani codebase. If something here disagrees with the code, the code
> wins — and you should update this file.

---

## 1. What is IPOGyani?

**IPOGyani** is India's IPO research platform. It ships:

- Live GMP (Grey Market Premium) tracking across 3 sources (InvestorGain,
  IPOWatch, IPOCentral) with a hybrid voting strategy.
- Real-time subscription tracking from NSE, BSE, and Chittorgarh.
- AI-predicted listing gains (ML model registry backed by Vercel Blob).
- Historical listed-IPO archive with ~40 enrichment columns per IPO
  (CSV-first, DB-merged).
- Expert reviews (manual admin-curated) and YouTube/news enrichment hooks
  (schema present, pipelines not wired).
- Admin dashboard with custom JWT auth (not Supabase Auth).
- A single Vercel cron that dispatches GMP + subscription scrapers and
  runs the IST-aware status transition job every 15 minutes.

---

## 2. Tech Stack

| Technology            | Version    | Purpose                                          |
|-----------------------|------------|--------------------------------------------------|
| Next.js               | 16.2.0     | App Router, RSC, route handlers                  |
| React                 | 19         | UI                                               |
| TypeScript            | 5.7.3      | Type safety                                      |
| Tailwind CSS          | 4.2.0      | Styling (CSS-first config in `globals.css`)      |
| Supabase              | 2.102.1    | Postgres + service-role API                      |
| `@supabase/ssr`       | ^0.10      | SSR cookie-aware client                          |
| Upstash Redis         | ^1.37      | Cache + rate limit + circuit breakers            |
| Vercel Blob           | ^2.3       | Logo uploads + ML model storage                  |
| `jose`                | ^6.2       | JWT sign/verify (admin auth)                     |
| `bcryptjs`            | ^3.0       | Password hashing (admin table)                   |
| `cheerio`             | ^1.2       | HTML parsing in scrapers                         |
| `fast-xml-parser`     | ^5.6       | NSE XML parsing                                  |
| `youtube-transcript`  | ^1.3       | YouTube review hook (scaffolded)                 |
| SWR                   | ^2.4       | Client-side data fetching                        |
| Recharts              | 2.15       | Charts                                           |
| Zustand               | ^5.0       | Client state where SWR doesn't fit               |
| Lucide React          | ^0.564     | Icons                                            |
| Sonner                | ^1.7       | Toasts                                           |
| React Hook Form + Zod | ^7.54 / ^3 | Forms + validation                               |

### Deployment

- **Primary:** Vercel (see `vercel.json` for cron wiring).
- **Alt:** Cloudflare Pages via OpenNext — see `CLOUDFLARE_DEPLOYMENT.md`
  in the repo root for the alternate build pipeline.

### Fonts

Only **Inter** is loaded, via `next/font/google` in `app/layout.tsx`,
exposed as CSS variable `--font-sans`. The `font-serif`/`font-mono`
classes are not configured — use the default Tailwind fallbacks if you
absolutely need them, or add another `next/font` loader.

> The old docs referenced Sora/DM Sans — those were removed. Do not
> reintroduce them without an explicit design ask.

---

## 3. Directory Structure

```
/
├── app/
│   ├── layout.tsx                    # Root layout (Inter font, Analytics, metadata)
│   ├── page.tsx                      # Homepage (RSC, fetches live + listed IPOs)
│   ├── globals.css                   # Design tokens + Tailwind v4 @theme
│   ├── sitemap.ts / robots.ts        # SEO
│   │
│   ├── ipo/[slug]/page.tsx           # Dynamic IPO detail page (hybrid: DB → static fallback)
│   ├── listed/
│   │   ├── page.tsx                  # Archive index
│   │   ├── [year]/page.tsx           # Year page (ISR, merged CSV + DB)
│   │   └── [year]/[slug]/page.tsx    # Listed-IPO detail (ISR, merged CSV + DB)
│   ├── gmp/                          # GMP tracker
│   ├── ipo-gmp/                      # Alias/variant page
│   ├── upcoming/                     # Upcoming IPOs
│   ├── sme/                          # SME IPOs
│   ├── allotment-status/             # Allotment checker
│   ├── subscription-status/          # Subscription tracker
│   ├── accuracy/ best-ipo/ listing-gain/ methodology/
│   │   shareholder-quota/            # Marketing / SEO pages
│   ├── about/ contact/ privacy/ disclaimer/
│   │
│   ├── admin/
│   │   ├── layout.tsx                # Custom auth wrapper (JWT in localStorage)
│   │   ├── login/ reset-password/    # Auth flow
│   │   ├── page.tsx                  # Dashboard
│   │   ├── ipos/
│   │   │   ├── new/ page.tsx
│   │   │   ├── [id]/page.tsx         # Full IPO editor (KPI, financials, peers, live sub, ...)
│   │   │   └── [id]/edit/page.tsx
│   │   ├── gmp/                      # GMP management
│   │   ├── reviews/                  # Expert review curation
│   │   ├── automation/               # Scraper health + trigger UI
│   │   └── settings/
│   │
│   └── api/
│       ├── admin/                    # Admin-only (middleware verifies JWT)
│       │   ├── login/ reset-password/
│       │   ├── auto-status/          # Exports runAutoStatusJob()
│       │   ├── data-quality/
│       │   ├── upload-logo/
│       │   ├── ipos/ (CRUD + nested: financials, issue-details, kpi,
│       │   │         peers, gmp-history, subscription-history,
│       │   │         subscription-live, migrate-listed)
│       │   ├── gmp/ reviews/
│       │   ├── scrape-ipo/ scrape-gmp/[ipoId]/
│       │   │   scrape-subscription/[ipoId]/
│       │   ├── scraper-health/
│       │   └── scrapers/[name]/trigger/
│       └── cron/                     # Auth via CRON_SECRET or admin JWT
│           ├── dispatch/             # THE cron (every 15 min on Vercel)
│           ├── scrape-gmp/           # exports runGmpScraper()
│           ├── scrape-subscription/  # exports runSubscriptionScraper()
│           ├── scrape-gmp-history/
│           ├── run-all/              # legacy/manual
│           └── update-subscriptions/ # legacy/manual
│
├── components/
│   ├── header.tsx footer.tsx ticker.tsx ipo-card.tsx status-bar.tsx theme-provider.tsx
│   ├── home/                         # Homepage sections
│   ├── ipo-detail/                   # IPO detail page (hero, tabs, KPI, financials,
│   │                                 #   peers, live subscription, expert reviews, ...)
│   ├── listed/                       # Archive table + filters + hero
│   ├── admin/                        # ipo-form (47 KB), bulk-data-entry, gmp-scrape-button
│   └── ui/                           # shadcn/ui components
│
├── lib/
│   ├── data.ts                       # Core types + large static fallback dataset
│   ├── utils.ts                      # cn() etc.
│   ├── auth-context.tsx              # React context for admin JWT in browser
│   ├── hash.ts jwt.ts                # bcryptjs + jose wrappers
│   ├── redis.ts                      # Upstash Redis + cache/rate-limit helpers
│   ├── bulk-data-parsers.ts          # Paste-blob → structured IPO fields
│   ├── supabase.ts                   # Legacy simple client (keep for imports)
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   ├── server.ts                 # RSC / route-handler client (cookie-aware)
│   │   ├── admin.ts                  # Service-role (server only; throws in browser)
│   │   └── queries.ts                # Shared query + transform helpers
│   ├── listed-ipos/
│   │   ├── loader.ts                 # CSV parser + sync loaders + ASYNC MERGED LOADERS
│   │   └── db.ts                     # Supabase `listed_ipos` adapter
│   └── scraper/
│       ├── base.ts                   # fetchWithRetry, logScraperRun, cron auth,
│       │                             #   circuit breakers (Redis)
│       ├── parsers.ts
│       └── sources/
│           ├── gmp-investorgain.ts
│           ├── gmp-ipowatch.ts
│           ├── gmp-ipocentral.ts
│           ├── subscription-nse.ts
│           ├── subscription-bse.ts
│           ├── subscription-chittorgarh.ts
│           ├── nse-session.ts        # NSE cookie/session handshake
│           └── index.ts
│
├── data/
│   └── listed-ipos/                  # Year-indexed CSVs (2016.csv, 2017.csv, ...)
│
├── scripts/                          # SQL migrations (applied in order) + seed scripts
│   └── ...001 → 015                  # See DATABASE_SCHEMA.md
│
├── public/                           # Logos, favicons
├── vercel.json                       # Cron definition
├── next.config.mjs
└── tsconfig.json
```

---

## 4. Data Sources and Rendering Strategy

### 4.1 Live / current IPOs (status = upcoming, open, lastday, closed, allot, listing)

- Authoritative source: Supabase `ipos` table + related tables.
- Fetched via `lib/supabase/queries.ts` helpers (`getCurrentIPOs`,
  `getIPOBySlug`).
- Pages: `app/page.tsx`, `app/upcoming/`, `app/sme/`, `app/gmp/`,
  `app/ipo/[slug]/`.
- Fallback: the giant static dataset in `lib/data.ts` when Supabase
  returns empty (useful for local dev without a DB).

### 4.2 Listed IPOs (status = listed)

**CSV-first + DB-merge** via `lib/listed-ipos/loader.ts`:

- Historical data lives in `data/listed-ipos/<year>.csv` (committed to
  git, ~40 columns per IPO).
- Freshly listed IPOs land in the `listed_ipos` DB table via the
  day-after-listing auto-migration (see §6).
- `getMergedListedIposByYear(year)` unions both sources, CSV wins on
  slug conflict.
- `getMergedListedIpo(year, slug)` checks CSV first, then DB.
- `getMergedAvailableYears()` unions the two sets.

Pages use **ISR** with `revalidate = 3600` and `dynamicParams = true`
so DB-only rows render on-demand and refresh hourly:

```tsx
// app/listed/[year]/page.tsx
export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  const years = await getMergedAvailableYears()
  return years.map(y => ({ year: String(y) }))
}
```

On migrate, the route handler calls `revalidatePath('/listed')`,
`/listed/<year>`, and `/listed/<year>/<slug>` so the archive updates
immediately (wrapped in try/catch — cron-triggered migrations have no
request context and can't call `revalidatePath`, which is fine because
ISR will still pick the change up within the window).

### 4.3 Client-side data

Use **SWR**. Examples:

```tsx
'use client'
import useSWR from 'swr'
const { data, error, isLoading } = useSWR('/api/admin/gmp', fetcher)
```

Do not `fetch()` inside `useEffect`. Do not use Zustand for server
data — Zustand is for client-local state only.

---

## 5. Authentication (Admin)

**This app does NOT use Supabase Auth.** It uses a custom table-based
flow:

- Table: `admins` (id UUID, username, password_hash, must_reset_password)
  — see migration `006_create_admin_table.sql`.
- `POST /api/admin/login` verifies bcryptjs hash and returns a JOSE JWT
  (HS256, 15-minute expiry) signed with `JWT_SECRET`.
- The browser stores the token (see `lib/auth-context.tsx`) and sends it
  as `Authorization: Bearer <token>` to `/api/admin/*`.
- `middleware.ts` (at repo root — covered separately) gates `/api/admin/*`
  and `/api/cron/*`. Cron routes also accept the `x-vercel-cron` header
  or a matching `CRON_SECRET`.
- Server-side DB writes use the service-role key via `lib/supabase/admin.ts`,
  which bypasses RLS. This is why the scraper/admin tables can keep RLS
  enabled with zero public policies (see `004c_align_admin_rls.sql`).

Default admin credentials after running migrations:
- `username: admin`
- `password: changeme123`
- `must_reset_password: true` — the login flow forces a reset on first
  login.

> Do **not** build new auth flows on top of Supabase Auth without first
> proposing the migration — the whole admin surface assumes the custom
> JWT.

---

## 6. IPO Status Lifecycle

```
upcoming → open → lastday → closed → allot → listing → listed
```

Driven by `runAutoStatusJob()` in `app/api/admin/auto-status/route.ts`,
called every 15 minutes by the dispatcher cron. IST-aware (5pm close
cutoff, `Asia/Kolkata` via `Intl.DateTimeFormat`):

| From       | To         | Gate                                                                 |
|------------|------------|----------------------------------------------------------------------|
| `upcoming` | `open`     | `today >= open_date`                                                 |
| `open`     | `lastday`  | `today === close_date`                                               |
| `lastday`  | `closed`   | `today > close_date` OR (`today === close_date` AND IST hour ≥ 17)   |
| `closed`   | `allot`    | `today >= allotment_date`                                            |
| `allot`    | `listing`  | `today === listing_date`                                             |
| `listing`  | `listed`   | `today > listing_date` AND `listing_price IS NOT NULL` → also triggers `migrateIpoToListed()` |

If `listing_price` is missing on the day after listing, the row stays
`listing` and is surfaced in the dispatcher's `pending` array so the
admin can enter it manually.

---

## 7. Automation / Scrapers

### 7.1 Dispatcher

`app/api/cron/dispatch/route.ts` is the single Vercel cron entry
(`vercel.json` schedule `*/15 * * * *`). Every tick it runs three jobs
in parallel:

1. `runGmpScraper()`    — multi-source GMP refresh
2. `runSubscriptionScraper()` — NSE/BSE/Chittorgarh subscription refresh
3. `runAutoStatusJob()` — status transitions + day-after migration

Each job result is logged to `scraper_health`, and the dispatcher logs
a summary row as well so the admin UI can show heartbeats.

### 7.2 Shared primitives — `lib/scraper/base.ts`

- `fetchWithRetry(url, options)` — retries 500ms / 1s / 2s on 5xx or 429,
  15s per-attempt timeout, default `IPOGyaniBot/1.0` User-Agent.
- `logScraperRun({ scraperName, status, itemsProcessed, durationMs,
  errorMessage })` — writes to `scraper_health`.
- `verifyCronAuth(request)` / `cronUnauthorized()` — `CRON_SECRET`
  enforcement.
- `circuitBreakerCheck(key)` / `circuitBreakerRecordFailure(key)` —
  Upstash-Redis-backed sliding window (1 hour, 5 failures).

### 7.3 Sources

Each source exports a pure function that takes `(url | symbol, fetcher)`
and returns parsed data. Wire them into the GMP/subscription scraper
route handlers. Never call `fetch()` directly — always `fetchWithRetry`
so retries, timeouts, and the shared UA are consistent.

---

## 8. Key TypeScript Types

All live in `lib/data.ts`. Headliners:

- `IPO` — the fat type used across the app (hero, detail, admin form).
- `ListedIpoRecord` (in `lib/listed-ipos/loader.ts`) — normalized archive
  row with ~40 optional numeric fields.
- `GMPHistoryEntry`, `SubscriptionHistoryEntry`, `SubscriptionLiveEntry`.
- `ExpertReview`, `PeerCompany`, `IssueDetails`, `KPIData`.
- `AnchorInvestor`, `NewsArticle`, `YouTubeSummary`, `IPOPrediction`.

### Column name mapping (TS ↔ DB)

| TypeScript          | Database column       |
|---------------------|-----------------------|
| `name`              | `company_name`        |
| `listDate`          | `listing_date`        |
| `leadManager`       | `brlm`                |
| `aboutCompany`      | `description`         |
| `gmpPercent`        | (computed in code)    |
| `issueSizeCr`       | `issue_size_cr`       |
| `freshIssueCr`      | `fresh_issue_cr`      |
| `ofsCr`             | `ofs_cr`              |
| `listingPrice`      | `listing_price`       |
| `listingGainPercent`| `listing_gain_percent`|
| `listDayClose`      | `list_day_close`      |
| `listDayChangePct`  | `list_day_change_pct` |
| `allotmentUrl`      | `allotment_url`       |
| `subscriptionLive`  | table `subscription_live` |

### `abbr` — clarification

- The `ipos.abbr` column **still exists in the database** (see migration
  `007_complete_setup.sql`). It is legacy.
- Application code **does not write to it anymore**. All abbreviations
  are generated on-the-fly with:

```ts
function buildAbbr(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'IP'
}
```

Do not add `abbr` back into new payloads or form fields.

---

## 9. Environment Variables

```env
# Supabase (required everywhere)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon>
SUPABASE_SERVICE_ROLE_KEY=<service-role>   # server only; never exposed

# Admin auth
JWT_SECRET=<long random string>

# Cron + scraper auth
CRON_SECRET=<long random string>

# Upstash Redis (cache, rate limit, circuit breaker)
UPSTASH_REDIS_REST_URL=<url>
UPSTASH_REDIS_REST_TOKEN=<token>

# Vercel Blob (logo + ML model uploads)
BLOB_READ_WRITE_TOKEN=<token>             # auto-provisioned when the integration is added
```

`createAdminClient()` in `lib/supabase/admin.ts` throws if
`SUPABASE_SERVICE_ROLE_KEY` is missing or if it's called in the browser —
if you see that error, you're calling admin code from a client component.

---

## 10. API Endpoints (summary)

All paths below are route handlers. Auth column = `admin` means the
request must carry a valid JWT (enforced by `middleware.ts`); `cron`
means `CRON_SECRET` header or Vercel `x-vercel-cron`.

### Public (read-only)

| Path                            | Purpose                                      |
|---------------------------------|----------------------------------------------|
| —                               | All public reads are server-side via Supabase clients, not REST |

### Admin (JWT required)

| Method | Path                                                     | Purpose                                         |
|--------|----------------------------------------------------------|-------------------------------------------------|
| POST   | `/api/admin/login`                                       | Username + password → JWT                       |
| POST   | `/api/admin/reset-password`                              | First-login password reset                      |
| GET/POST | `/api/admin/ipos`                                      | List / create IPO                               |
| GET/PATCH/DELETE | `/api/admin/ipos/[id]`                         | Read / update / delete a single IPO             |
| POST   | `/api/admin/ipos/[id]/migrate-listed`                    | Migrate IPO → `listed_ipos` (manual)            |
| GET/POST | `/api/admin/ipos/[id]/financials`                      | IPO financials (upsert by fiscal_year)          |
| GET/POST | `/api/admin/ipos/[id]/issue-details`                   | Single-row issue structure                      |
| GET/POST | `/api/admin/ipos/[id]/kpi`                             | Dated + pre/post KPI entries                    |
| GET/POST | `/api/admin/ipos/[id]/peers`                           | Peer company rows                               |
| GET/POST | `/api/admin/ipos/[id]/gmp-history`                     | GMP time series                                 |
| GET/POST | `/api/admin/ipos/[id]/subscription-history`            | Day-wise subscription history                   |
| GET/POST | `/api/admin/ipos/[id]/subscription-live`               | Current category-wise subscription              |
| POST   | `/api/admin/scrape-ipo`                                  | Scrape a Chittorgarh IPO page into form fields  |
| POST   | `/api/admin/scrape-gmp/[ipoId]`                          | Refresh GMP for one IPO                         |
| POST   | `/api/admin/scrape-subscription/[ipoId]`                 | Refresh subscription for one IPO                |
| POST   | `/api/admin/scrapers/[name]/trigger`                     | Manually trigger a named scraper                |
| GET    | `/api/admin/scraper-health`                              | Last N runs per scraper                         |
| POST   | `/api/admin/auto-status`                                 | Run status transitions now                      |
| GET    | `/api/admin/data-quality`                                | Data-completeness report                        |
| POST   | `/api/admin/upload-logo`                                 | Upload to Vercel Blob → returns public URL      |
| GET/POST/DELETE | `/api/admin/gmp` and `/api/admin/gmp/[id]`      | Manual GMP entries                              |
| GET/POST/DELETE | `/api/admin/reviews` and `/api/admin/reviews/[id]` | Expert reviews                               |

### Cron

| Path                                | Who runs it           | What it does                              |
|-------------------------------------|-----------------------|-------------------------------------------|
| `/api/cron/dispatch`                | Vercel, every 15 min  | Fans out to the three jobs (see §7.1)     |
| `/api/cron/scrape-gmp`              | dispatcher            | `runGmpScraper()`                         |
| `/api/cron/scrape-subscription`     | dispatcher            | `runSubscriptionScraper()`                |
| `/api/cron/scrape-gmp-history`      | manual / legacy       | Backfill                                   |
| `/api/cron/run-all`                 | manual                | Full refresh                              |
| `/api/cron/update-subscriptions`    | manual / legacy       | Kept for compatibility                    |

---

## 11. Design System

`app/globals.css` defines the design tokens as CSS variables (Tailwind
v4 `@theme` / `@import 'tailwindcss'`). Never write raw colors in code —
always use the token classes.

### Core palette

```
--primary:      #4F46E5   (Indigo, brand)
--emerald:      #15803D   (Green, positive/gain)
--destructive:  #DC2626   (Red, negative/loss)
--gold:         #B45309   (Amber, warnings)
--cobalt:       #1D4ED8   (Blue, info)

--ink:          #111827   (Primary text)
--ink2:         #374151   (Secondary text)
--ink3:         #6B7280   (Muted)
--ink4:         #9CA3AF   (Disabled)

--background:   #F8FAFC
--card:         #FFFFFF
--border:       #E5E7EB
```

**Rules:**
- Stick to max 5 colors. The primary + emerald/destructive + ink shades
  is almost always enough.
- No gradients unless a specific component already uses one.
- No purple/violet.
- When you override a background color, override the text color.

---

## 12. Common Tasks

### Add a new IPO field

1. Add the column via a new `scripts/NNN_*.sql` migration (never mutate
   older scripts).
2. Add the field to the `IPO` interface in `lib/data.ts`.
3. Map it in `lib/supabase/queries.ts::transformIPO()` (and back in the
   admin POST/PATCH handler).
4. Surface in `components/admin/ipo-form.tsx`.
5. Render where needed in `components/ipo-detail/*`.

### Add a new page

1. Create `app/<route>/page.tsx`.
2. Add to `components/header.tsx` nav if it's top-level.
3. Add to `app/sitemap.ts` (and `app/robots.ts` if it should be
   disallowed).

### Add a scraper source

1. New file in `lib/scraper/sources/<name>.ts`. Export a pure function
   that takes a URL or symbol and a fetcher and returns parsed data.
2. Always use `fetchWithRetry` from `lib/scraper/base.ts`.
3. Wire into the relevant runner (`/api/cron/scrape-gmp/route.ts` or
   `/api/cron/scrape-subscription/route.ts`). Vote/merge with existing
   sources.
4. Call `logScraperRun` at the end with `items_processed` and duration.

### Add a listed-IPO enrichment column

1. Add the column to `data/listed-ipos/README.md` so humans know it.
2. Add to `ListedIpoRecord` in `lib/listed-ipos/loader.ts`.
3. Parse in the CSV loader.
4. If it's DB-sourceable, map it in `lib/listed-ipos/db.ts`.
5. Render in `components/listed/archive-table.tsx` (and the detail page).

---

## 13. Known Gotchas

- **Schema cache.** If Supabase starts rejecting a column you know
  exists (`PGRST204` / "Could not find the 'X' column in the schema
  cache"), run `NOTIFY pgrst, 'reload schema';` in the SQL editor, or
  click "Reload schema" under `Project Settings → API`.
- **IDs are `SERIAL` integers, not UUIDs.** The old docs were wrong. See
  `DATABASE_SCHEMA.md` for the canonical types. Foreign keys like
  `ipo_id INTEGER REFERENCES ipos(id)` are everywhere.
- **`listed_ipos` has a different PK type than some recent migrations
  suggest.** `007_complete_setup.sql` creates `listed_ipos.id SERIAL`.
  The `lib/listed-ipos/db.ts` adapter types it as `number`.
- **ISR + dynamicParams on `/listed/*`.** If you change the merged
  loaders, remember that year pages are `revalidate = 3600, dynamicParams = true`
  and depend on the CSV files existing in the build. Do not accidentally
  switch them back to `force-static`.
- **`createAdminClient()` in a client component** throws. If you see
  `createAdminClient() must not be called from a client component`,
  move the code to a route handler or RSC.
- **bcrypt vs bcryptjs.** Both are in `package.json` because of a past
  migration. The app currently uses **`bcryptjs`** in `lib/hash.ts`.
  Do not introduce a second hashing path.

---

## 14. Changelog

| Date       | Change                                                                 |
|------------|------------------------------------------------------------------------|
| 2026-04-18 | Rewritten. Corrected ID types (SERIAL not UUID), added scraper layer, admin auth, merged listed-IPO loader, cron dispatcher, all migrations up to 015. |
| 2026-04-10 | Original version (partially inaccurate — see above).                   |

---

## 15. Notes for AI Agents

1. **Read `DATABASE_SCHEMA.md` before writing SQL.** The schema is
   bigger than it looks.
2. **Prefer editing over recreating.** Especially for `lib/data.ts`,
   `components/admin/ipo-form.tsx`, and route handlers — they're large
   and have lots of cross-references.
3. **Never commit credentials or run `rm -rf`** anywhere. All destructive
   ops require user permission.
4. **Use `lib/supabase/admin.ts` only in server code.** If you import it
   from a file marked `"use client"`, the build will still succeed but
   the code will throw at runtime.
5. **Status-transition logic lives in one place** (`auto-status/route.ts`).
   Do not replicate it; call `runAutoStatusJob()` if you need it inline.
6. **For the listed archive**, CSV is authoritative for historical rows,
   DB for fresh ones. Never "sync CSV from DB" without a ticket — the
   CSV is hand-curated....
