# Subscription Scraper Handover

Context doc for the next v0 agent. The previous session ran out of credit mid-implementation. Read this end-to-end before touching code.

## TL;DR

- **User bug report:** Adisoft (open, NSE SME) and Mehul Telecom (closed, BSE SME) showed identical subscription numbers on the homepage IPO cards — retail 37.41 / nii 79.38 / qib 32.50 / total 44.91. Same values on both cards, both detail pages.
- **Root cause (confirmed by DB query):** Adisoft's `ipos.chittorgarh_url` column in the connected Supabase is pointing at Mehul's Chittorgarh page (`https://www.chittorgarh.com/ipo/mehul-telecom-limited-ipo/2536/`). The scraper is behaving correctly — it scrapes whatever URL it's given and writes the numbers against Adisoft.
- **Why the admin's paste didn't fix it:** The admin form exposes a field labeled *"InvestorGain Subscription URL — Primary source for live subscription"* that writes to `ipos.investorgain_sub_url`. **No scraper reads that column.** There is no `subscription-investorgain.ts`. The column is dead weight. The Chittorgarh URL is the only one driving the actual scrape, and that one is stale/wrong.
- **User's decision:** Build a real InvestorGain subscription scraper so the admin-pasted URL (`investorgain_sub_url`) becomes the primary source, with Chittorgarh as fallback. User explicitly declined the title-match defensive guard — they'll keep URLs clean themselves.

## What's already done in this branch

Nothing for subscription scraping yet. Only investigation was completed. The previous session's actual code changes in this chat were unrelated:

1. `lib/supabase/queries.ts` — fixed `IPOSimple.last_gmp_update` → `gmp_last_updated`, and switched `transformIPO` to prefer `ipos.gmp_last_updated` over `gmp_history.recorded_at` for the displayed "Updated X ago" timestamp. (This fixed the separate GMP freshness bug.)
2. `app/api/cron/scrape-gmp/route.ts` — when all sources return `no_data`, still bump `ipos.gmp_last_updated`.
3. `components/ipo-detail/ipo-tabs.tsx` — removed the public-facing "Add Data Manually" admin link from the Subscription tab empty state.

These are committed. Do not redo them.

## What needs to be built

### 1. `lib/scraper/sources/subscription-investorgain.ts` (NEW)

A new subscription source module that:

- Exports a function with the same signature pattern as `lib/scraper/sources/subscription-chittorgarh.ts` so `app/api/cron/scrape-subscription/route.ts` can call it the same way.
- Takes the `investorgain_sub_url` (e.g. `https://www.investorgain.com/subscription/adisoft-technologies-ipo/2042/`) and returns `{ total, retail, nii, qib, anchor?, employee?, shareholder? } | null`.
- Uses the same fetch/UA pattern as `lib/scraper/sources/gmp-investorgain.ts` (that file is already working, copy the fetch headers and error handling).
- Returns `null` on non-200, empty body, or parse failure — do not throw.

**What the InvestorGain subscription page looks like (for the parser):**

The previous agent confirmed:
- URL pattern: `https://www.investorgain.com/subscription/<slug>/<id>/` (e.g. `.../adisoft-technologies-ipo/2042/`).
- `<title>` contains the total, e.g. `"Adisoft Technologies SME Live Subscription. Total: 1.40 times."` — this alone is enough for a total-only fallback if the table parse fails. Regex: `/Total:\s*([\d.]+)\s*times/i`.
- The page has a visible subscription table with category rows (QIB, NII, Retail, Total, sometimes Employee / Shareholder / Anchor). The previous agent was about to inspect the exact HTML structure with the curl dump at `/tmp/ig.html` when credit ran out. **Step 1 for the next agent: run `curl` on that URL, save to `/tmp/ig.html`, and read the structure around the first `QIB` occurrence to see whether it's an HTML `<table>`, a flex grid of divs, or JSON embedded in a `<script>` tag.** The previous bash attempts all hit permission prompts — just approve them and run.
- Expect subscription values as decimals in `"1.40x"` / `"1.40"` format. Strip `x` / `X` / commas / whitespace before `parseFloat`.

**Parser implementation notes:**
- Use `cheerio` — it's already a project dep; `subscription-chittorgarh.ts` uses it.
- Match rows by category label (case-insensitive `trim`), not by row index. InvestorGain reorders categories across IPOs.
- For category aliases: `"QIB"` / `"Qualified Institutional Buyers"`, `"NII"` / `"Non Institutional Investors"` / `"HNI"`, `"Retail"` / `"Retail Investors"` / `"Retail Individual Investors"`, `"Total"` / `"Total (incl EMP)"` — the parentheses matter for distinguishing "Total" from "Total Application".
- Validate: each numeric must be `>= 0` and `< 10000`. Reject obvious junk.

### 2. Wire it into `app/api/cron/scrape-subscription/route.ts`

Current order (read the file — it's ~500 lines): NSE → BSE → Chittorgarh, with Chittorgarh only attempted if the IPO has `chittorgarh_url`.

New desired order: **InvestorGain first (if `investorgain_sub_url` is set) → NSE → BSE → Chittorgarh fallback**.

Match the existing outcome object shape (look for `outcomes.push(...)` inside `processIpoSubscription`). Add a new source string `"investorgain"` to whatever discriminated union / type is in use — grep for `subscription_source` in `lib/supabase/queries.ts` and the cron file.

When InvestorGain succeeds, write `subscription_source = 'investorgain'` on the `ipos` row upsert.

### 3. Admin scrape-ipo route

`app/api/admin/scrape-ipo/route.ts` has an "InvestorGain Subscription" scrape path at line 114 (per grep). Verify whether it already expects an investorgain subscription scraper or whether it just falls through. If it references a function that doesn't exist, wire it to the new `subscription-investorgain.ts`.

### 4. Do NOT add a title-match guard

User explicitly said: *"admin will add the proper url to scrape"* — they don't want a defensive company-name check on the Chittorgarh (or any) scraper that rejects mismatched pages. Skip it. If a URL is wrong, the fix is to correct the URL in admin, not to make the scraper second-guess.

### 5. Data cleanup for the user's current bad row

After the code change, the user still has Adisoft row with wrong `chittorgarh_url` and wrong cached subscription numbers. Two options, ask the user:

a) They'll fix the URL in the admin dashboard themselves and re-run the scraper manually (`app/api/admin/scrape-subscription/[ipoId]/route.ts`). Preferred — no migration script needed.

b) Offer to write a one-off script in `scripts/` to clear `subscription_total/retail/nii/qib` + `subscription_live` rows for Adisoft so the stale cached values don't render until the next cron tick.

## Evidence collected (DB queries already run by user)

Run against the connected Supabase (user confirmed they connected a different Supabase to the build env — ask them if you need fresh output).

### Query 1 — `ipos` row state

Both rows returned:
- `mehul-telecom-limited-ipo` / BSE SME / `allot` / close 2026-04-21 / `chittorgarh_url = https://www.chittorgarh.com/ipo/mehul-telecom-limited-ipo/2536/` / subs 44.91 / 37.41 / 79.38 / 32.5 / source `chittorgarh`
- `adisoft-technologies-limited-ipo` / NSE SME / `open` / close 2026-04-27 / `chittorgarh_url = https://www.chittorgarh.com/ipo/mehul-telecom-limited-ipo/2536/` **← WRONG, same URL** / subs 44.91 / 37.41 / 79.38 / 32.5 / source `chittorgarh`

Both have `nse_symbol = NULL` and `bse_scrip_code = NULL`, so NSE/BSE sources are being skipped and Chittorgarh is the only live source — which explains why the wrong URL poisoned the data.

### Query 2 — `subscription_live`

Confirmed byte-identical values written to both IPOs (ipo_id 2 = Mehul, ipo_id 3 = Adisoft). Mehul frozen at 2026-04-21 18:30 (bidding close), Adisoft rewritten today 2026-04-23 08:30 — proving the cron wrote Mehul's values onto Adisoft on a recent run.

### Query 3

User got an error because `subscription_history` uses `created_at`, not `updated_at`. Not actually needed for the diagnosis, already complete without it.

## Repo conventions the next agent must follow

- **No ORM.** Direct `supabase.from(...)` calls. Match the style in `scrape-subscription/route.ts`.
- **No localStorage / client-only storage.** Cron writes to Supabase, UI reads from Supabase through `lib/supabase/queries.ts`. Never bypass.
- **Package manager:** there's a `pnpm-lock.yaml` at repo root. Use `pnpm add` if a new dep is needed (shouldn't be — `cheerio` and `undici`/native fetch already available).
- **Cron cadence:** `/api/cron/dispatch` is driven by the Cloudflare Worker at `cloudflare-worker/` every 15 min. Do not touch that — it's working. User confirmed dispatcher rows appear every ~15 min in `scraper_health`.
- **Scraper health telemetry:** every scraper run writes a row to `scraper_health` (see `app/api/cron/scrape-gmp/route.ts` for the pattern — `logScraperRun` helper). The new InvestorGain source must do the same so `/admin/automation` surfaces its status.

## Files the next agent will need to read (in order)

1. `lib/scraper/sources/subscription-chittorgarh.ts` — template to clone.
2. `lib/scraper/sources/gmp-investorgain.ts` — existing InvestorGain fetch pattern, copy the UA/headers.
3. `app/api/cron/scrape-subscription/route.ts` — dispatcher to wire the new source into; note the `processIpoSubscription` function and the `outcomes` shape.
4. `lib/supabase/queries.ts` — `subscription_source` type union and `transformIPO` to make sure the new source string doesn't break display logic.
5. `components/admin/ipo-form.tsx` lines ~884–897 — the admin field labeled "InvestorGain Subscription URL". Its label is accurate once the scraper exists; no form change needed.
6. `scripts/002_add_scrape_fields.sql` and `scripts/012_add_gmp_source_urls.sql` — confirm `investorgain_sub_url` column already exists (it does, per grep; no migration needed).

## Quick sanity checks before claiming done

1. `pnpm tsc --noEmit` clean.
2. Hit `/api/admin/scrape-subscription/3` (Adisoft's id) after the user pastes a correct Adisoft URL into `investorgain_sub_url` and verify `subscription_live` rows for ipo_id 3 reflect InvestorGain's table, not Mehul's values.
3. Verify `subscription_source` on `ipos` row for ipo_id 3 flips to `investorgain`.
4. Verify homepage card for Adisoft shows the correct (non-44.91) value.
5. Verify `scraper_health` has rows with `scraper = 'subscription-investorgain'` (or whatever naming convention the existing subscription sources use — check before naming).

## Anything else the next agent should know

- User is non-technical-adjacent but careful — they paste URLs into admin and expect them to work. Don't silently swallow a misconfigured URL. Do log clearly to `scraper_health.error` when a source is skipped because the URL field is empty vs. when it 404s.
- `ai_ref/` contains other handovers (`GMP_SCRAPER_FIX_HANDOVER.md`, `SCRAPER_HANDOVER.md`, `AI_CODEBASE_GUIDE.md`, `DATABASE_SCHEMA.md`, `QUICK_REFERENCE.md`). Read `AI_CODEBASE_GUIDE.md` and `DATABASE_SCHEMA.md` first before writing code — they contain the column names, table relationships, and conventions this project uses.
- The user has a separate Supabase connected to the build env. If you need to query DB state, ask them to run SQL — don't assume the schema from scripts folder alone (though scripts after `006_*` reflect what's actually deployed, per user).
