# GMP Scraper Handover — next v0 agent

Read `ai_ref/SCRAPER_CONTEXT.md` **first** for the full system overview. This
file documents only what is in flight right now.

## The user's goal

> "If we can scrape all 3 successfully we should avg it, or go with whatever
> data we get. In this case the scraper should give some value because I can
> see it on investorgain. BTW `-` should be considered as `0` GMP."

Translation:

1. Add **investorgain.com** as a third GMP source alongside IPOWatch and ipoji.
2. Normalize `-`, `—`, `N/A`, empty → **`0`** (currently parsed as `null`).
3. Average whatever subset of sources returned a number (including `0`s).
   If at least one source returned a numeric value, record it. Only flag
   `failed` when every source hard-errored.

Reference IPO for testing: `citius-transnet-invit-ipo` (InvIT, currently in
the window, both existing sources return no numeric GMP but the value
*should* be `0`).

- investorgain shows `₹0` for 17-20 Apr 2026 at
  `https://investorgain.com/gmp/citius-transnet-invit-ipo-gmp/2126/`
- IPOWatch shows `₹-` (dash) for the same dates
- ipoji shows `0` at `https://ipoji.com/ipo/citius-transnet-invit-ipo`

## What's already done (already committed to branch)

### 1. Status-classification fix in the GMP + subscription crons — DONE

Files changed:
- `app/api/cron/scrape-gmp/route.ts`
- `app/api/cron/scrape-subscription/route.ts`

Both now distinguish three outcomes per IPO:

- **got data** → insert / skip as before
- **all sources cleanly returned no_data** → counted as `skipped` with
  reason `no_data_on_sources`, run status = `success`
- **at least one source threw** → `failed`, `scraper_health.error_message`
  records `<slug>: <source1>:<err1>; <source2>:<err2>` (first 5 failures only)

Result verified in admin dashboard: GMP now reports `Success` with message
`"No GMP data yet on sources for 1/1 IPOs: citius-transnet-investment-trust-invit-ipo"`.

The orchestrator functions `runGmpScraper` and `runSubscriptionScraper`
now return an extra `no_data` field; types updated.

## What still needs to be done

### 2. Treat `-` / `—` / `N/A` / empty as `0` — DONE

Files changed:
- `lib/scraper/parsers.ts` — `parseGMP` now accepts an options bag
  `{ dashAsZero?: boolean }`. Default behaviour is unchanged (empty /
  dash / N/A → `null`). With `dashAsZero: true`, the tokens `-`, `--`,
  `—`, `–`, `N/A`, `NA`, `nil`, `none`, `not available` (and with
  leading `₹` / `Rs.` / `INR`) all return numeric `0`. Truly empty
  input and `null` still return `null` regardless.
- `lib/scraper/sources/gmp-ipowatch.ts` — the matched-row caller in the
  listing parser AND the article-page row parser both now pass
  `{ dashAsZero: true }`. Only applied AFTER the row has been matched
  by name (so "row missing entirely" still returns `null`, per the
  user's careful-rule).
- `lib/scraper/sources/gmp-ipoji.ts` — the stat-block caller inside the
  matched card passes `{ dashAsZero: true }`. `parseIpojiPremium` also
  now recognises the full placeholder set (`--`, `—`, `–`, `nil`,
  `none`, `not available`).
- `scripts/verify-scrapers-e2e.ts` — added 18 parser unit cases for
  the new contract and kept the live-source cases; all 25/25 pass.
  The existing live case "IPOWatch listing - zero-GMP IPO
  (Adisoft Technologies)" is the regression guard for this change —
  it expects `0`, not `null`.

Sanity: `averageGMP` in `app/api/cron/scrape-gmp/route.ts` already uses
`o.gmp !== null && typeof o.gmp === "number"` and preserves `0`; the
Redis cache path uses `cached !== null && typeof cached === "number"`
and also preserves `0`. No further orchestrator changes needed.

### 3. Add investorgain.com as a 3rd GMP source — SUPERSEDED (see SCRAPER_CONTEXT.md)

**Blocker discovered while debugging:** the investorgain detail page
(`https://investorgain.com/gmp/citius-transnet-invit-ipo-gmp/2126/`) is
122 KB of Next.js HTML but the day-wise GMP `<table>` is **not in the
initial SSR payload**. `cheerio.load(html).find('table')` returns 1 empty
table. The page hydrates client-side.

Next steps to figure out how to scrape investorgain:

1. Open the page in a real browser with DevTools → Network tab and
   **find the XHR/fetch that returns the day-wise GMP JSON**. It's likely
   something like `/api/ipo/gmp/{id}` or a `_next/data/.../{slug}.json`.
   The last script we ran found no `/api/` string in the HTML, so it's
   probably `_next/data/<buildId>/gmp/<slug>-gmp/<id>.json`.
   Grab `buildId` from the HTML: `grep -oE '"buildId":"[^"]+"' /tmp/ig.html`
2. Once you have the JSON endpoint, fetch it from Node (SSR cheerio is
   NOT needed for JSON) and parse directly.
3. If the data really is only available post-hydration via a private XHR
   that requires a session cookie or CSRF header, **fall back to their
   listing page** `https://www.investorgain.com/report/live-ipo-gmp/331/ipo/`
   — that page historically ships the table in SSR HTML. Lookup by IPO
   name (case-insensitive `includes`) the same way the other two sources
   do.
4. Create `lib/scraper/sources/gmp-investorgain.ts` mirroring the shape of
   `gmp-ipowatch.ts` / `gmp-ipoji.ts` — a default export that takes a
   `{ slug, symbol, company_name }` and returns
   `{ gmp: number | null, source: 'investorgain', error?: string }`.
   Honour `SCRAPER_CONTEXT.md`'s circuit breaker, user-agent rotation,
   timeout, and `dashAsZero` rules.

### 4. Wire the new source into the orchestrator — NOT YET DONE

In `app/api/cron/scrape-gmp/route.ts`:

- Import the new scraper.
- Add it to the `sources` array used by `processIpoGMP` (grep for
  `ipowatchGmp` / `ipojiGmp` / `Promise.all` / `averageGMP`).
- `averageGMP` already takes whatever subset is non-null — no change
  required there as long as numeric `0` is preserved (double-check it
  does not do `if (!gmp)` which would drop zeros; use `gmp !== null`).

### 5. Verify end-to-end

- `pnpm exec tsx scripts/verify-scrapers-e2e.ts` — extend this with a
  case for `citius-transnet-invit-ipo` that asserts GMP resolves to `0`,
  not `null`.
- Trigger the cron manually from the admin dashboard ("Run Now") and
  confirm the health card shows:
  - Status: Success
  - Items last run: 1
  - message: includes an average of `0` for citius, inserted 1.

## Useful commands / breadcrumbs

```bash
# Quick SSR probe
curl -sS -o /tmp/ig.html -w "HTTP %{http_code} SIZE %{size_download}\n" \
  -L -A "Mozilla/5.0" \
  "https://investorgain.com/gmp/citius-transnet-invit-ipo-gmp/2126/"

# Find Next.js build id + any embedded JSON
grep -oE '"buildId":"[^"]+"' /tmp/ig.html
grep -oE '_next/data/[^"]+' /tmp/ig.html | sort -u

# E2E verifier (read-only, does not touch DB)
pnpm exec tsx scripts/verify-scrapers-e2e.ts

# Full debug with prod Supabase requires creds that are NOT in sandbox env
# Run `scripts/debug-gmp-cron.ts` only after sourcing production env or
# skip and verify via the deployed /api/cron/scrape-gmp?manual=1
pnpm exec tsx scripts/debug-gmp-cron.ts
```

## Files most likely to touch

- `lib/scraper/parsers.ts` — add `dashAsZero` option
- `lib/scraper/sources/gmp-ipowatch.ts` — use `dashAsZero: true`
- `lib/scraper/sources/gmp-ipoji.ts` — use `dashAsZero: true` (the ipoji
  table explicitly shows `0`, but add it defensively)
- `lib/scraper/sources/gmp-investorgain.ts` — **new file**
- `app/api/cron/scrape-gmp/route.ts` — register the new source
- `scripts/verify-scrapers-e2e.ts` — add test case for citius InvIT

## Gotchas

- Do **not** use a headless browser (Playwright/Puppeteer) — Vercel
  serverless doesn't ship Chromium and we already rejected that path in
  `SCRAPER_CONTEXT.md`. Find the JSON endpoint or the SSR listing page.
- The prod Supabase credentials are **not** in the sandbox env file, so
  `scripts/debug-gmp-cron.ts` fails locally with a Supabase URL error.
  That is expected. Verify via the deployed admin dashboard.
- `averageGMP` must preserve `0` as a valid value. If it does
  `if (!x) skip` anywhere, that's a bug to fix while you're in there.
- The old `- should be considered as 0` rule applies ONLY when the IPO's
  row is actually present on that source with a valid date. A completely
  absent row is still no-data, not `0`.
