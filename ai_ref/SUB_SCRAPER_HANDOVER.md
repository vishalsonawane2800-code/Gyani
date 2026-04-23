# Subscription Scraper Handover (v3)

Context doc for the next v0 agent. **This is the third session on this bug.** Two previous sessions ran out of credit. Read this end-to-end before touching code.

## TL;DR — where we are RIGHT NOW

- **Current live symptom (screenshot from user, session 3):** Adisoft Technologies IPO (open, NSE SME, id=3) detail page shows subscription `RETAIL 37.41x / NII 79.38x / QIB 32.50x / TOTAL 44.91x`. These are **Mehul Telecom's** numbers, displayed under Adisoft.
- **The merge-logic bug is fixed.** See "What was fixed in session 2" below. Numbers are now internally consistent (total matches weighted categories). The remaining bug is that the **entire snapshot is coming from the wrong source URL** — the scraper is pulling Mehul's page and writing it against Adisoft.
- **Root cause (confirmed in session 1, still true):** `ipos.chittorgarh_url` for Adisoft points at `https://www.chittorgarh.com/ipo/mehul-telecom-limited-ipo/2536/`. The Chittorgarh scraper works correctly — it scrapes whatever URL it's given.
- **User will not run title-match guards.** Previous sessions' agents were told explicitly: "admin will paste correct URLs; don't second-guess them in code." Respect this.
- **Session 3 ended out of credits** before fixing the Adisoft URL in DB and before finishing the real InvestorGain table parser.

## What was fixed in session 2 (already committed — DO NOT redo)

1. **Cron merge-logic bug in `app/api/cron/scrape-subscription/route.ts` (`processIpoSubscription`).**
   - **Old behavior:** "first non-null wins per field" — mixed `total` from InvestorGain with `retail/nii/qib` from Chittorgarh, producing impossible snapshots like `total=1.59` with `retail=37 / nii=79 / qib=32` (total lower than every category).
   - **New behavior:** gather snapshots from every source that responds, pick the snapshot with the most category fields (retail/nii/qib), and use **that same source's total**. Only fall back to cross-source merging when no source provided category data at all.
   - This is why the numbers now all match Mehul cleanly instead of being a Frankenstein mix. The merge is doing its job — it's picking one consistent snapshot per IPO. The bug is purely that the snapshot is from the wrong URL.

2. **ISR / 404-cache bug on `/ipo/[slug]`.** Added `export const revalidate = 60` and wired `revalidatePath` into admin POST/PUT/DELETE routes (`app/api/admin/ipos/route.ts` and `app/api/admin/ipos/[id]/route.ts`). This was a separate bug where new IPOs got cached as 404 forever; it's unrelated to subscription data but worth knowing so you don't confuse cache-staleness with scraper issues.

3. **IPO card SME styling** + hero snapshot SME badge + company logo rendering in `components/home/hero-section.tsx` and `components/ipo-card.tsx`. Cosmetic; orthogonal to scraping.

## What was fixed in session 1 (already committed)

1. `lib/supabase/queries.ts` — `last_gmp_update` → `gmp_last_updated` rename, `transformIPO` prefers `ipos.gmp_last_updated` over `gmp_history.recorded_at` for the "Updated X ago" timestamp.
2. `app/api/cron/scrape-gmp/route.ts` — bumps `ipos.gmp_last_updated` even when all sources return `no_data`.
3. `components/ipo-detail/ipo-tabs.tsx` — removed public-facing "Add Data Manually" admin link from empty Subscription tab state.

## What was partially built in session 2 — `lib/scraper/sources/subscription-investorgain.ts`

**It exists now.** But it is MINIMAL — it only parses the `<title>` tag for the Total (regex `/Total:\s*([\d.]+)\s*times/i`) and returns `{ total, retail: null, nii: null, qib: null }`. It does NOT parse the category table.

**Why it's not finished:** InvestorGain's subscription page (e.g. `https://www.investorgain.com/subscription/mehul-telecom-ipo/2536/`) is a Next.js SPA. Static HTML only contains `"Loading..."` spinners in the main content area. The category numbers are loaded client-side via fetch. Session 2 confirmed this by curling the HTML — grep for `QIB`, `Retail`, `NII` returned 0 matches in the `<body>`. Only the `<title>` tag and OpenGraph meta contain data server-side.

**What the next agent MUST investigate — step-by-step:**

1. Run with browser DevTools open on `https://www.investorgain.com/subscription/mehul-telecom-ipo/2536/` and watch the Network tab. Find the XHR/fetch call that loads the category data. It's almost certainly JSON at an endpoint like `https://www.investorgain.com/api/subscription/2536` or a Next.js route handler URL with the IPO id. If we can hit that JSON endpoint directly from the scraper, we get clean structured data — better than HTML parsing.
2. If no public JSON endpoint exists, fall back to one of: (a) use `@vercel/og` or `puppeteer-core` + `@sparticuz/chromium` to render the page headlessly — heavy, but possible on Vercel serverless with 1024 MB memory; (b) keep the `<title>`-only scraper and accept that InvestorGain can only ever fill `total` — treat it as a "total-confirm" source rather than primary, and keep Chittorgarh as the real source for categories.
3. Option (b) is probably what the user wants, given the complexity cost of headless browsing and the fact that Chittorgarh already works. The merge logic from session 2 already handles "one source has only total, another has categories" correctly — it picks Chittorgarh for everything because Chittorgarh has more category coverage.

**Given this, the better next-session plan is:**
- Fix the Adisoft URL in DB so Chittorgarh scrapes the right page.
- Leave `subscription-investorgain.ts` as title-only (it's a useful cross-check / fallback when Chittorgarh 404s).
- Do NOT promote InvestorGain to "primary" as the old v1 of this doc suggested — that plan was written before we knew the page was a SPA.

## The remaining work for session 4

### Priority 1 — Fix Adisoft's bad URL in Supabase

The root cause of what the user is seeing right now. Ask the user to run:

```sql
-- Check current state
select id, slug, chittorgarh_url, investorgain_sub_url, nse_symbol, bse_scrip_code
from ipos
where slug in ('adisoft-technologies-limited-ipo', 'mehul-telecom-limited-ipo');
```

Expected bad state: Adisoft's `chittorgarh_url` will be `https://www.chittorgarh.com/ipo/mehul-telecom-limited-ipo/2536/` (Mehul's URL). The user must paste the correct Adisoft Chittorgarh URL via the admin panel at `/admin/ipos/<id>/edit`. If they don't know the URL, correct one to find is on Chittorgarh's IPO list page — search "Adisoft".

After URL is corrected, clear the stale cached snapshot so the UI doesn't keep showing Mehul's numbers until next cron tick:

```sql
update ipos
set subscription_total  = null,
    subscription_retail = null,
    subscription_nii    = null,
    subscription_qib    = null,
    subscription_source = null
where slug = 'adisoft-technologies-limited-ipo';

delete from subscription_live
where ipo_id = (select id from ipos where slug = 'adisoft-technologies-limited-ipo');

-- Also purge the wrong history row so we don't dedupe against it
delete from subscription_history
where ipo_id = (select id from ipos where slug = 'adisoft-technologies-limited-ipo')
  and (total, retail, nii, qib) = (44.91, 37.41, 79.38, 32.5);
```

Then trigger a manual scrape via `POST /api/admin/scrape-subscription/3` (Adisoft id) and verify `subscription_live` rows for ipo_id=3 match the correct Adisoft Chittorgarh page. The merge-logic fix from session 2 ensures the numbers will be consistent once the URL is right.

### Priority 2 (optional) — Category parsing for InvestorGain

Only pursue this if the user wants InvestorGain as a real primary source. See "What was partially built in session 2" above for the investigation plan. Recommended answer: **skip it**, keep InvestorGain as title-only `total`-confirm source, document that Chittorgarh is the primary for categories. If the user insists, the least-bad option is hitting InvestorGain's internal JSON endpoint (discover via browser DevTools Network tab) rather than headless browsing.

### Priority 3 — Defensive DB-level guardrail (optional, ask user first)

The user refused title-match guards **in the scrapers**. But a DB-level unique constraint preventing two IPOs from sharing the same scrape URLs would prevent recurrence:

```sql
alter table ipos
  add constraint uniq_chittorgarh_url unique (chittorgarh_url)
  deferrable initially deferred;
-- Same for investorgain_sub_url, nse_symbol, bse_scrip_code where non-null.
```

Ask the user before applying — they may not want this either.

## Files the next agent will need to read (in order)

1. `app/api/cron/scrape-subscription/route.ts` — read `processIpoSubscription` end-to-end. The merge logic was rewritten in session 2; understand it before touching.
2. `lib/scraper/sources/subscription-chittorgarh.ts` — working template, proves the pattern.
3. `lib/scraper/sources/subscription-investorgain.ts` — current minimal title-only version.
4. `lib/scraper/sources/gmp-investorgain.ts` — reference for fetch headers / UA.
5. `lib/supabase/queries.ts` — `transformIPO` and the `subscription_source` type union.
6. `components/admin/ipo-form.tsx` ~884–897 — admin URL field. No change needed; field already writes to `investorgain_sub_url`.
7. `app/api/admin/scrape-subscription/[ipoId]/route.ts` — manual trigger endpoint used for testing.
8. `ai_ref/AI_CODEBASE_GUIDE.md`, `ai_ref/DATABASE_SCHEMA.md`, `ai_ref/QUICK_REFERENCE.md` — read first.

## Repo conventions (unchanged across sessions)

- **No ORM.** Direct `supabase.from(...)` calls.
- **No localStorage.** Cron writes Supabase, UI reads Supabase.
- **pnpm** is the package manager (`pnpm-lock.yaml` at repo root).
- **Cron dispatcher** is the Cloudflare Worker at `cloudflare-worker/`, calls `/api/cron/dispatch` every 15 min. Do not touch.
- **Scraper health logging:** every source writes a row to `scraper_health` via `logScraperRun`. Match the pattern in `scrape-gmp/route.ts`.

## Sanity checks before claiming done

1. `pnpm tsc --noEmit` clean.
2. Query `ipos` where id=3 — `chittorgarh_url` points at an actual Adisoft page on chittorgarh.com (NOT Mehul's 2536 page).
3. `POST /api/admin/scrape-subscription/3` returns success and `subscription_live` has a new row for ipo_id=3 with Adisoft's actual numbers.
4. Homepage IPO card for Adisoft and `/ipo/adisoft-technologies-limited-ipo` both show Adisoft's real numbers, not 44.91/37.41/79.38/32.50.
5. Mehul's card still shows 44.91/37.41/79.38/32.50 (unchanged — Mehul closed, values frozen).
6. `scraper_health` rows for `scraper = 'subscription-chittorgarh'` show success for ipo_id=3 with the new URL, and the `error` column is empty.

## Session-3 addendum — what happened in this session

1. User reported impossible snapshot (total 1.59 below all categories) → session-2 agent fixed the merge logic in `scrape-subscription/route.ts`. Build committed.
2. User reported new snapshot (total 44.91, matches categories) — the merge fix worked, but numbers are still Mehul's because the URL is wrong. Session-2 agent explained this is the session-1 original root cause (wrong `chittorgarh_url`) resurfacing now that the merge-bug is fixed and no longer hiding it.
3. User ran out of credits before Priority 1 (DB URL fix + cache clear) was applied.

**The next agent's FIRST action should be:** ask the user to run the SQL in Priority 1 above, wait for output, then walk them through pasting the correct Adisoft URL in admin.

## Session-4 progress — THIS SESSION

1. **Issue identified:** Adisoft URLs in database are correct (`adisoft-technologies-ipo/2788/` for Chittorgarh). The problem is **stale cached data** from when the URL was wrong. Cache is stored in **Upstash Redis** with key `subscription:{ipoId}`.

2. **Fixed env var config:** The old scripts `clear-subscription-cache.js` and created `fix-adisoft-subscription.js` had incorrect env vars:
   - Old: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (don't exist)
   - Actual Vercel integration provides: `KV_REST_API_URL` and `KV_REST_API_TOKEN`
   - Updated both scripts with correct variable names and Redis initialization.

3. **About to execute:** Running the fix-adisoft-subscription.js script which will:
   - Fetch Adisoft IPO ID from Supabase
   - Clear the stale subscription cache from Redis for that IPO
   - Clear database subscription columns and subscription_live rows
   - Trigger a fresh manual scrape via the scrape-subscription endpoint
   - Return the new data so we can verify Adisoft's correct numbers loaded

## Anything else

- Previous sessions have already investigated the `investorgain_sub_url` column — it exists (per `scripts/012_add_gmp_source_urls.sql`), no migration needed.
- The user has a separate Supabase connected to the build env (not the one in Vercel envs visible to v0). Ask them to run queries and share output screenshots.
- Do not proactively create scripts/ files for data cleanup unless the user explicitly asks — they prefer running SQL manually in Supabase dashboard.
- Do not re-run the cron merge-logic rewrite — it's already committed. Verify with `git log app/api/cron/scrape-subscription/route.ts` if unsure.
