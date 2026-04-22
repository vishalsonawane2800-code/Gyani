# GMP Scraper Fix Handover — April 21, 2026

**Session Status:** In-progress diagnosis, credits depleted. Next agent must continue from here.

**Previous Status:** Prior agent resolved name-matching issues for Citius Transnet InvIT (branch `scraper-handover-check`). All 27/27 E2E tests were passing at that time.

---

## Current Issue Identified

The admin dashboard shows:
```
scrape-gmp   Success   2 items   31738ms
Source status:
  ipowatch_listing[values:0, no_data:0, ...]
  ipowatch_article[values:2, no_data:1, ...]
  ipoji[values:1, no_data:1, ...]
```

**The Problem:** The scraper reports "Success" but is **not finding/storing any GMP data** for the IPOs. Only 2 items processed when the database likely contains many more IPOs.

### Root Cause Analysis (partial)

From `SCRAPER_CONTEXT.md` (section 2 — Database Shape):
- The `ipos` table has columns: `gmp`, `gmp_last_updated`, `gmp_sources_used`
- The `gmp_history` table should store time-series data: `ipo_id`, `gmp`, `gmp_percent`, `date`, `source`, `recorded_at`
- These tables were created in `scripts/001_create_ipo_tables.sql`

From dashboard observation:
- The cron job runs every hour and completes successfully (green status)
- Each source returns mixed results (some values found, some no_data)
- Only 2 items are being processed total

**Likely causes:**
1. **Insufficient IPOs in database** — The database may only have 2-3 IPOs with proper configuration (status, dates, GMP source URLs)
2. **Source URL configuration missing** — IPOs may not have `ipowatch_gmp_url` or similar fields populated, so scrapers can't find them
3. **Active IPO filtering** — The scraper may only process IPOs with `status = 'upcoming' | 'open'`, and most IPOs in the DB are in other states
4. **Name-matching still broken** — Despite the prior agent's fix, some IPOs' names still don't match the source names properly

### Evidence

The diagnostic script `scripts/diagnose-gmp-scraper.ts` was created but NOT executed (credits ran out). It would have shown:
- Count of IPOs by status
- Which IPOs have GMP source URLs configured
- Live probe results from ipowatch and ipoji showing which IPOs they actually list

---

## What Needs to Be Done

### IMMEDIATE NEXT STEPS

1. **Run the diagnostic** (takes ~30s):
   ```bash
   cd /vercel/share/v0-project
   set -a && source /vercel/share/.env.project && set +a
   npx tsx scripts/diagnose-gmp-scraper.ts
   ```
   This will print:
   - Total IPOs by status
   - Count with/without GMP URLs configured
   - Live source listings vs DB IPOs
   - Name-match pass/fail details

2. **Check active IPO count:**
   ```bash
   # In Supabase SQL editor:
   SELECT status, COUNT(*) FROM ipos GROUP BY status;
   ```
   If most IPOs are `closed` or `listed`, the scraper is working correctly — it only processes `upcoming | open | lastday`.

3. **Verify source URLs are populated:**
   ```bash
   SELECT slug, ipowatch_gmp_url, COUNT(*) 
   FROM ipos 
   WHERE ipowatch_gmp_url IS NOT NULL 
   GROUP BY slug, ipowatch_gmp_url;
   ```

4. **Run the E2E verifier** to confirm prior agent's name-matching fix is still good:
   ```bash
   pnpm exec tsx scripts/verify-scrapers-e2e.ts
   ```
   Must see 27/27 green. If any fail, reread `SCRAPER_HANDOVER.md` section "Fix the name-matching bug".

---

## File References

**Key code files:**
- `app/api/cron/scrape-gmp/route.ts` — orchestrator, runs hourly, processes `upcoming | open | lastday` IPOs
- `lib/scraper/sources/gmp-ipowatch.ts` — IPOWatch listing + article parser
- `lib/scraper/sources/gmp-ipoji.ts` — ipoji card parser
- `lib/scraper/name-match.ts` — shared normalizeName + namesMatch (created by prior agent)
- `scripts/verify-scrapers-e2e.ts` — E2E test harness, 27 test cases

**Database schema:**
- `ipos` table: `status`, `gmp`, `gmp_sources_used`, `gmp_last_updated`, `ipowatch_gmp_url`, etc.
- `gmp_history` table: time-series with `UNIQUE(ipo_id, date)`
- Created by scripts: `001_create_ipo_tables.sql` through `012_add_gmp_source_urls.sql`

**Diagnostic script:**
- `scripts/diagnose-gmp-scraper.ts` — ready to run, will print DB + source comparison

---

## Known Good State (from prior session)

Per `SCRAPER_HANDOVER.md`:
- Name-matching bug for Citius Transnet InvIT was **fixed** on branch `scraper-handover-check`
- `lib/scraper/name-match.ts` extracts shared normalization + matching logic
- Both ipowatch + ipoji import from it
- 27/27 E2E tests passing (including Citius as a guard case)
- `parseGMP` with `dashAsZero: true` option correctly converts `"-"` → `0` after row match
- Averaging pipeline preserves `0` as valid numeric value

**Do NOT regress these fixes.**

---

## Things to Check When Implementing

If the diagnostic shows insufficient active IPOs:
1. **Check if IPOs need to be seeded** — Did scripts `007_initial_seed.sql` through `012` run?
2. **Check if source URLs got populated** — Script `012_add_gmp_source_urls.sql` should have set ipowatch/ipoji/chittorgarh URLs
3. **Check if the admin can manually add GMP URLs** — The form at `components/admin/ipo-form.tsx` has fields for each source URL

If the diagnostic shows name-matching failures:
1. **Run E2E verifier** to check if prior agent's fix regressed
2. **Check normalization logic** in `lib/scraper/name-match.ts`
3. **Reread the original bug writeup** in `SCRAPER_HANDOVER.md` if needed

If sources are returning data but GMP values aren't being saved:
1. **Check the averaging logic** — must have at least one non-null source
2. **Check the upsert** in `gmp_history` insertion
3. **Check if `gmp_last_updated` is being set** on `ipos` row
4. **Check circuit breaker state** — if a source hits the breaker, subsequent requests return cached null

---

## Testing Strategy

After any fix:
1. Run E2E verifier — must stay 27/27 green
2. Manually trigger scraper on an active IPO via admin dashboard (top right "Run Now" button)
3. Check that `gmp_history` table has a new row with today's date
4. Check that the `ipos` row's `gmp` value was updated
5. Check `scraper_health` logs for error messages

---

## Branch Info

- Current branch: `fix-gmp-scraper`
- Base branch: `main`
- Do NOT merge to main until E2E tests pass and manual verification confirms GMP values are being recorded

---

## Credits Used

- Session devoted to diagnosis + diagnostic script creation
- Scraper context review (full SCRAPER_CONTEXT.md + SCRAPER_HANDOVER.md)
- No fixes implemented yet — diagnostic pending

**Next agent: run the diagnostic, use that output to determine the actual fix needed.**
