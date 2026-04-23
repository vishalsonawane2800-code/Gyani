# contest1.md — IPOGyani Complete Codebase Context

_Last generated: 2026-04-23 (UTC)_

## 1) Repository at a glance

IPOGyani is a **Next.js App Router** application for IPO research/tracking with:
- public SEO pages,
- dynamic live IPO + GMP + subscription views,
- a custom-authenticated admin panel,
- automation/scraper endpoints,
- Supabase-backed storage,
- CSV-backed listed-IPO historical data merged with DB records.

Primary stack and versions come from `package.json`:
- Next.js `16.2.0`, React `19`, TypeScript `5.7.3`
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- Tailwind CSS `4.2.0`
- Upstash Redis, JOSE JWT, bcryptjs, SWR, Zustand, Radix/shadcn UI

## 2) High-level module map

### Frontend app (`app/`)
- **Root pages**: homepage (`app/page.tsx`) and multiple SEO/marketing pages (`about`, `privacy`, `disclaimer`, `methodology`, etc.).
- **Live IPO views**: `upcoming`, `sme`, `gmp`, `subscription`, `subscription-status`, `allotment-status`, dynamic IPO detail `ipo/[slug]`.
- **Listed archive**: `app/listed/page.tsx`, `app/listed/[year]/page.tsx`, `app/listed/[year]/[slug]/page.tsx`.
- **Admin UI**: `app/admin/*` including dashboard, IPO editor, GMP manager, reviews, news, automation, settings, and auth pages.
- **API Route Handlers**:
  - `app/api/admin/*` (admin CRUD, scrape triggers, uploads, quality checks)
  - `app/api/cron/*` (periodic scraper and dispatcher hooks)
  - `app/api/public/*` and community/auth user endpoints.

### UI components (`components/`)
- `components/ui/*`: shared shadcn/Radix primitives.
- `components/home/*`: homepage sections.
- `components/ipo-detail/*`: detail page blocks (hero, tabs, financials, KPI, peers, subscription tracker, etc.).
- `components/admin/*`: heavy admin forms and bulk entry surfaces.
- Shared global shell components: header/footer/ticker/status/theme.

### Shared logic (`lib/`)
- `lib/supabase/*`: browser/server/admin clients + query helpers.
- `lib/scraper/*`: scraper base/parsers/name-matching and source-specific logic.
- `lib/listed-ipos/*` and `lib/listed-sme-ipos/*`: CSV/DB merge loaders for archives.
- `lib/auth-context.tsx`, `lib/user-auth-context.tsx`: auth state providers.
- `lib/jwt.ts`, `lib/hash.ts`: token and password helpers.
- `lib/redis.ts`: cache/circuit-breaker infrastructure.
- `lib/data.ts`: static/fallback IPO dataset and shared types.

### Data and migrations
- `scripts/*.sql`: schema + incremental migrations (001…030 and related scripts).
- `scripts/*.ts|*.mjs|*.js`: migration runners, diagnostics, and scraper tests.
- `data/listed-ipos/*` and `data/listed-sme-ipos/*`: CSV templates + historical data.

### Deployment/runtime
- `vercel.json`, `netlify.toml`, `_routes.json`, `cloudflare-worker/*`.
- Environment template: `.env.example`.

## 3) Request flow (mental model)

1. **Public page render**
   - App Router page loads server-side data via Supabase query helpers.
   - For listed IPO archives, data merges CSV + DB.
   - Components render server and client boundaries as needed.

2. **Admin flow**
   - Admin logs in via `/api/admin/login`.
   - JWT-based custom auth is used by admin routes and middleware guards.
   - Admin pages call `/api/admin/*` handlers for CRUD and actions.

3. **Automation/cron flow**
   - Scheduled jobs call `/api/cron/*` endpoints.
   - Dispatcher fans out to GMP/subscription scrapers and related status jobs.
   - Results persist to Supabase; caches/logs are updated.

## 4) Key domains represented in code

- IPO master records and detail sections (issue details, financials, KPI, peers, FAQs, company profile).
- GMP current/history with scraper integrations.
- Subscription live/history and status transitions.
- Listed IPO archive with CSV-first strategy and DB synchronization.
- Community/expert reviews + market news in admin/public surfaces.
- Data quality and scraper health monitoring endpoints for operators.

## 5) Security and config assumptions

- Admin auth is **custom JWT + admins table**, not Supabase Auth.
- Service role key is used server-side for privileged DB operations.
- Cron endpoints use secret/header-based checks and middleware protections.
- Requires Supabase and cron secrets from `.env` (see `.env.example`).

## 6) Current footprint snapshot

Non-`node_modules`, non-`.git` file-type counts:
- `.tsx`: 144
- `.ts`: 85
- `.sql`: 36
- `.md`: 34
- `.mjs`: 18

Directory file counts:
- `app`: 87 files (`app/api`: 40)
- `components`: 99
- `lib`: 31
- `scripts`: 59
- `data`: 18

## 7) Where to start for future agents

1. `README.md` for setup/runtime assumptions.
2. `app/layout.tsx`, `app/page.tsx`, and `app/ipo/[slug]/page.tsx` to understand user-facing core flows.
3. `lib/supabase/queries.ts` and `lib/data.ts` for central data contracts.
4. `app/api/admin/*` + `middleware.ts` for auth/admin control plane.
5. `app/api/cron/*` + `lib/scraper/*` for automation execution paths.
6. `scripts/schema.sql` and latest numbered migrations for schema intent.
7. `ai_ref/AI_CODEBASE_GUIDE.md` for deep operational context and historical decisions.

## 8) Notes on completeness

This document is a **single-context orientation file** intended to speed onboarding and planning. It covers structure, responsibilities, and flow boundaries across the whole repository, while deferring line-level implementation detail to the source files.
