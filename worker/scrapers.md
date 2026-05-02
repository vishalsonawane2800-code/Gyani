
Action: file_editor create /app/memory/PRD.md --file-text "# IPOGyani — Worker Scraper PRD

## Original Problem
Build a reliable multi-source GMP scraping system inside `/worker`. The
existing `gmp-ipowatch.js` returned NULL for most IPOs, parsing was
fragile (regex false-positives returning IPO price instead of GMP), and
there was only one source (IPOWatch).

## Architecture (target)
- **Frontend (Vercel)** — Next.js, reads Supabase only.
- **Cloudflare Worker** — cron trigger, fires `/api/cron/dispatch`.
- **Railway Worker (this repo's `/worker`)** — Node/Express, runs scrapers.
- **Supabase** — single source of truth for GMP / subscription / metadata.

## What was implemented (2026-05-02)

### `worker/scrapers/_utils.js` (new)
Shared primitives:
- `fetchWithRetry(url, opts)` — native fetch, 3 retries on 5xx/429, 15s
  abort timeout, default desktop Chrome UA.
- `normalizeName(name)` — folds typographic apostrophes (`'` → `'`),
  strips possessive `'s`, strips multi-word boilerplate
  (`investment trust`, `real estate investment trust`,
  `infrastructure investment trust`) and single tokens
  (`limited`, `ltd`, `pvt`, `private`, `the`, `ipo`, `sme`, `reit`,
  `invit`, …), collapses non-alphanumerics.
- `namesMatch(a, b)` — exact / startsWith / contiguous-whole-word-run.
  Rejects reorderings (\"India Cements\" ≠ \"Cements India\"). Requires
  shorter side ≥ 6 chars post-normalization.
- `parseGMP(raw, { dashAsZero })` — handles `₹10`, `+10`, `10`,
  `₹ 10-12` (range → midpoint), `3-4 (3%)`, `10 GMP`, `Rs. 10/-`,
  `-` / `N/A` / `nil` → null (or 0 with `dashAsZero`).

### `worker/scrapers/ipowatch.js` (new, replaces fragile logic)
- Scans **both** IPOWatch tables (live + historical).
- Picks GMP column by header label (rejects `listing`, `issue price`,
  `lot`, `%`, etc.).
- Emits debug logs (`html length`, `parsed N tables`, `matched row`,
  `extracted GMP col N`).
- Supports admin article-URL override via `ipowatch_gmp_url`.
- Returns `{ source: \"ipowatch\", gmp: number | null }`.
- Fixes the old bug where `Om Power Transmission` returned `175` (IPO
  price) instead of `2` (GMP).

### `worker/scrapers/ipoji.js` (new)
Card-based scraper for ipoji.com. Strips date/exchange tail from card
titles, reads `.ipo-card-body-stat` for `Exp. Premium`.
Returns `{ source: \"ipoji\", gmp }`.

### `worker/scrapers/investorgain.js` (new)
Per-article-URL scraper (InvestorGain listing is SPA-rendered). Triggered
only when `investorgain_gmp_url` is supplied.
Returns `{ source: \"investorgain\", gmp }`.

### `worker/scrapers/index.js` (new)
`scrapeAllGMP(ipo)` fans out to all three sources in parallel with
`Promise.allSettled`, averages non-null numeric results:
```
{ company_name, sources: [{source, gmp}, ...], gmp, gmp_count, scraped_at }
```

### `worker/scrapers/gmp-ipowatch.js`
Kept as a backward-compat shim (re-exports from `ipowatch.js` in the
legacy `{ gmp: number } | null` shape) so any caller still importing the
old path keeps working.

### `worker/server.js`
Routes:
- `GET /health` — unchanged
- `GET /test` — unchanged
- `GET /api/gmp/:company` — **multi-source aggregate** (NEW)
- `GET /api/gmp/ipowatch/:company[?url=]` — single-source (NEW)
- `GET /api/gmp/ipoji/:company` — single-source (NEW)
- `GET /api/gmp/investorgain/:company?url=` — single-source (NEW)
- `POST /api/cron/dispatch` — now runs multi-source and returns result
  instantly; body: `{ job: \"gmp\", company_name, ipowatch_gmp_url?,
  investorgain_gmp_url? }`.

## Verification (2026-05-02)
Live scraping against ipowatch.in and ipoji.com:
- `Recode Studios` → IPOWatch=37, IPOji=32, avg=34.5
- `Bagmane REIT` → IPOWatch=4, IPOji=4, avg=4
- `Kissht` → IPOWatch=4 (live table, col \"IPO GMP\")
- `Om Power Transmission` → IPOWatch=2 (previously 175, **bug fixed**)
- `Sai Parenteral's` → IPOWatch=0 (typographic apostrophe match works)
- 29 unit tests: normalizeName / namesMatch / parseGMP — all pass.
- All HTTP endpoints return 200 with correct JSON.

## Next Action Items
- **Supabase write-back**: `scrapeAllGMP` result needs to be upserted
  into a `ipo_gmp` table. Requires Supabase service-role key
  (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) in Railway env.
- **Cloudflare Worker**: wire the cron to POST `/api/cron/dispatch` with
  `{ job: \"gmp\", company_name }` for every active IPO from Supabase.
- **CRON_SECRET auth**: add bearer-token check on `/api/cron/dispatch`.
- **Circuit breaker + scraper_health logging**: port from
  `lib/scraper/base.ts` once Redis + Supabase are wired.
- **Batching**: loop over active IPOs server-side so CF Worker sends
  one POST instead of N.

## Potential enhancement
Add a tiny `/api/gmp/diff/:company` endpoint that returns the
day-over-day GMP delta from Supabase plus the current multi-source
snapshot — makes it trivial to surface \"GMP up ₹3 today\" badges on the
listing cards and drive re-engagement without another scrape cycle.
"
Observation: Create successful: /app/memory/PRD.md
