# Handoff Prompt for Next Agent — gyani3 IPO Automation

Copy-paste everything below the `---` into the next chat as the first message.

---

## Context

You are resuming work on **chhayasonawane5723-cloud/gyani3** (branch `ipo-automation-layer`).
The previous agent finished the approved plan's DB migrations but ran out of tokens before writing the application code.
The full plan is in `v0_plans/light-draft.md` — **read it first before touching anything else.**

**Supabase project id:** `otqxuyrynxdermcnmdru`
**Vercel project id:** `prj_SpgLqCvThkHxEg9jk8zWn95tSQFd` (team `team_mCXAmAmBSTceEQ9G2788JJBQ`)

## What is already DONE

Three migrations were applied to the Supabase database (they were successful — do NOT re-run them):

1. **`scripts/007_complete_setup.sql`** — full canonical schema was applied (the DB was empty, had to bootstrap first). Tables now exist: `ipos`, `listed_ipos`, `gmp_history`, `subscription_history`, `expert_reviews`, `peer_companies`, `reviews`, `admins`, `ipo_financials`, `ipo_issue_details`.
2. **`scripts/014_add_allotment_url.sql`** — adds `ipos.allotment_url TEXT` (nullable).
3. **`scripts/015_add_listing_day_fields.sql`** — adds `ipos.list_day_close NUMERIC(10,2)` and `ipos.list_day_change_pct NUMERIC(6,2)`.

The SQL files for 014 and 015 are committed at `scripts/014_add_allotment_url.sql` and `scripts/015_add_listing_day_fields.sql`.

## What is LEFT to do (this is the session's remaining work)

### 1. Wire `allotment_url`, `list_day_close`, `list_day_change_pct` through the type system

- **`lib/supabase/queries.ts`** — the `IPOSimple` / raw row select + `transformIPO` function. Find where `registrar`, `listing_price` etc are mapped and add `allotmentUrl`, `listDayClose`, `listDayChangePct`.
- **`lib/data.ts`** — the `IPO` TypeScript interface (grep for `export interface IPO\b`). Add optional fields: `allotmentUrl?: string`, `listDayClose?: number`, `listDayChangePct?: number`.
- **`app/api/admin/ipos/route.ts` (POST)** and **`app/api/admin/ipos/[id]/route.ts` (PUT)** — add the three new fields to the insert/update payload (pass-through from body to DB columns `allotment_url`, `list_day_close`, `list_day_change_pct`).

### 2. Admin IPO form

- **`components/admin/ipo-form.tsx`** — add three inputs:
  - `Allotment URL` (text, appears in the same section as registrar — around line 941 where `registrar` field lives).
  - New **"Listing Day Data"** section near the bottom with `List Day Close` (number) and `List Day Change %` (number, readonly/auto-computed from `(listDayClose - listingPrice) / listingPrice * 100` if both present — but still allow manual override).
- Wire state, defaultValues, and JSON body POST/PUT payloads.

### 3. Check Allotment button

- **`components/ipo-detail/page-footer.tsx`** — the file currently has a `registrarUrls` map and renders a "Check Allotment" link.
- Change render condition to only show when `ipo.status === 'allot' || ipo.status === 'listing'`.
- URL priority: `ipo.allotmentUrl || registrarUrls[ipo.registrar] || null`. If null, hide button.

### 4. 5pm IST auto-status + migrate-to-listed

- **`app/api/admin/auto-status/route.ts`** — currently does date-only transitions. Refactor:
  - Build an IST helper using `Intl.DateTimeFormat('Asia/Kolkata', { hour: 'numeric', hour12: false })` to get current IST hour + IST `YYYY-MM-DD`.
  - Transition `lastday → closed` only when `todayIST >= close_date AND istHour >= 17`. Before 5pm on close_date → stay `lastday`.
  - On the day AFTER `listing_date`, if `list_price` (DB column `listing_price`) is set, call the new helper `migrateIpoToListed(id)` to move the row into `listed_ipos`. If `list_price` is missing, keep status `listing` and include it in the response's `pending` array.
  - Export a plain async function `runAutoStatusJob()` that returns `{ updated, pending, errors }`; keep the existing `GET` handler as a thin wrapper that calls it.
- **`app/api/admin/ipos/[id]/migrate-listed/route.ts`** — refactor so the core logic lives in an exported `migrateIpoToListed(id: number)` helper; the route handler calls it. Map fields: `company_name`, `name`, `slug`, `abbr`, `bg_color`, `fg_color`, `exchange`, `sector`, `list_date` from `ipos.listing_date`, `issue_price` from `ipos.price_max`, `list_price` from `ipos.listing_price`, `listing_price`, `current_price` from `ipos.list_day_close`, `gain_pct` from `ipos.list_day_change_pct` (fallback to `listing_gain_percent`), `year` from `YEAR(listing_date)`, `nse_symbol`, `bse_scrip_code`, `logo_url`, `original_ipo_id = ipos.id`. Upsert by slug. After successful insert, UPDATE `ipos.status = 'listed'` (or delete — check what the team prefers; the existing route's behavior is the source of truth).
- **`app/api/cron/dispatch/route.ts`** — import `runAutoStatusJob` and add it to the existing job list so it runs on the same cron schedule. No new `vercel.json` cron slot needed.

### 5. Homepage Live IPOs block

- **`components/home/hero-section.tsx`** and **`components/home/current-ipos.tsx`** — currently use data filtered to `open/lastday`. Add fallback: if that array is empty, fetch `upcoming` and render those with:
  - Heading reworded ("Upcoming IPOs" vs "Live IPOs").
  - Status pill color differs.
  - **Hide GMP% column / value** for upcoming rows (GMP is meaningless pre-open).
- Source of truth: `getCurrentIPOs()` or similar in `lib/supabase/queries.ts` — extend it to accept a fallback flag, or add a new `getLiveOrUpcomingIPOs()` helper that returns `{ ipos, mode: 'live' | 'upcoming' }`.

### 6. Listed filters year dropdown

- **`components/listed/listed-filters.tsx`** — the `years` array only has 2024-2026. Extend to `['2026','2025','2024','2023','2022','2021']`.

## Important Notes

- **Dev server + package manager:** this project uses **pnpm** (see `pnpm-lock.yaml`). Run commands from `/vercel/share/v0-project`. No new dependencies are needed for this work.
- **Never push to `main`** — push to `ipo-automation-layer` branch.
- When committing, do NOT override git identity; just add the trailer `Co-authored-by: v0[bot] <v0[bot]@users.noreply.github.com>`.
- The `ipos.status` enum values in the DB are: `open`, `lastday`, `allot`, `listing`, `upcoming`, `closed`. There is NO `listed` value in the enum — after listing-day migration the row should either (a) be deleted from `ipos` or (b) have status set to `closed`. Check `app/api/admin/ipos/[id]/migrate-listed/route.ts` for the existing behavior before changing.
- The `status` column is `TEXT` not the `ipo_status` enum, so any string works, but stay consistent with what the frontend filters on.
- IST is UTC+5:30 — never hand-roll timezone math; always use `Intl.DateTimeFormat('Asia/Kolkata', ...)`.

## Deferred (DO NOT build this session, capture in plan only)

- Excel/CSV bulk import for 200-300 historical IPOs. Column schema is already documented at the bottom of `v0_plans/light-draft.md` — a future `scripts/016_expand_listed_ipos.sql` migration will add the 30+ columns (sector, retail_quota_pct, issue_price_upper, closing_price_nse, gmp_pct_d1..d5, etc.).
- DB-backed `/listed` page (currently still reads from static `lib/data.ts`).
- Per-IPO `/listed/[slug]` SEO detail pages.
- Inline YouTuber reviews inside the IPO form.

## Suggested first actions

1. `Read v0_plans/light-draft.md` in full.
2. `Read lib/supabase/queries.ts` (top 260 lines covers `IPOSimple` + `transformIPO`).
3. `Read lib/data.ts` lines 1-280 for the `IPO` interface.
4. `Read app/api/admin/auto-status/route.ts` and `app/api/admin/ipos/[id]/migrate-listed/route.ts` — these are the biggest logic refactors.
5. Use `TodoManager` to set the 4 remaining tasks (types wiring → admin form → auto-status/cron → homepage+filters).
6. Make changes in dependency order (types first, then API, then components).

Good luck.
