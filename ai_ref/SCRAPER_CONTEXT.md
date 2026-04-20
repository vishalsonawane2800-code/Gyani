# Scraper Context

> Current-state reference for the GMP + subscription scrapers.
> Keep this doc in sync whenever you touch anything under
> `lib/scraper/` or the `/api/cron/scrape-*` / `/api/admin/scrape-*` routes.
>
> Branch at time of last update: `scraper-diagnosis-and-fixes`
> Last verified live: 2026-04-20 — 7/7 E2E checks passing
> (see section 8, `scripts/verify-scrapers-e2e.ts`)

---

## 1. System wiring

```
Vercel Cron (hourly)
  ├─> /api/cron/scrape-gmp           ── Node runtime
  └─> /api/cron/scrape-subscription  ── Node runtime
                                         │
                                         ▼
                          lib/scraper/sources/*.ts
                          ├── gmp-ipowatch.ts                (ACTIVE)
                          ├── gmp-ipoji.ts                   (ACTIVE)
                          ├── gmp-investorgain.ts            (DISABLED — kept for history)
                          ├── gmp-ipocentral.ts              (DISABLED — kept for history)
                          ├── subscription-chittorgarh.ts    (ACTIVE, fallback)
                          ├── subscription-nse.ts            (ACTIVE, primary)
                          ├── subscription-bse.ts            (ACTIVE, primary)
                          └── nse-session.ts                 (cookie warm-up for NSE)

Admin manual trigger (per IPO):
  /api/admin/scrape-gmp/[ipoId]           ─┐ both call into the exported
  /api/admin/scrape-subscription/[ipoId]  ─┘ processIpoGMP / processIpoSubscription
                                             from the cron route directly (no HTTP hop)

Cloudflare Worker (cloudflare-worker/):
  Separate deployment, used as a proxy for sources that block Vercel egress.
  Any code shared with the worker must avoid Node-only imports.
```

### Source URL overrides (admin-provided)
Each IPO row in Supabase can carry a per-source URL filled in by an admin on
the IPO form. Scrapers MUST prefer these over any slug-derived URL:

- `chittorgarh_url`        — Chittorgarh IPO detail page
- `ipowatch_gmp_url`       — IPOWatch GMP page (listing OR per-IPO article)
- `investorgain_gmp_url`   — stored but currently UNUSED (source disabled)
- `ipocentral_gmp_url`     — stored but currently UNUSED (source disabled)
- `nse_symbol`, `bse_code` — for NSE / BSE subscription APIs

SQL for these columns lives in `scripts/003_*.sql` and `scripts/012_*.sql`;
those are already applied in Supabase. Do NOT re-run them — add new numbered
scripts only.

---

## 2. Database shape (relevant columns)

Table `ipos`:
- `id`, `slug`, `company_name`
- `status` — `upcoming | open | lastday | closed | allot | listing | listed`
- `open_date`, `close_date`, `listing_date`
- `chittorgarh_url`, `ipowatch_gmp_url`, `investorgain_gmp_url`, `ipocentral_gmp_url`
- `nse_symbol`, `bse_code`
- `gmp`, `gmp_last_updated`, `gmp_sources_used` (text[])
- `subscription_retail`, `subscription_nii`, `subscription_qib`, `subscription_total`
- `subscription_updated_at`

Time-series:
- `gmp_history(ipo_id, gmp, gmp_percent, date, source, recorded_at)` — UNIQUE(ipo_id, date)
- `subscription_history(ipo_id, source, retail, nii, qib, total, recorded_at)`

Full schema: `ai_ref/DATABASE_SCHEMA.md`.

---

## 3. Active GMP sources

### 3a. IPOWatch — `lib/scraper/sources/gmp-ipowatch.ts`

- Listing URL: `https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/`
- Response from Vercel: 200 OK with desktop Chrome UA. Returns bot-style
  content for the default IPOGyaniBot UA — we override headers per fetch.
- Page has TWO tables. We parse **only the first** ("Current Live GMP").
  Headers: `[IPO Name, Open Date, Close Date, Price, Lot, GMP, Listing]`.
  Table 2 (historical, ~270 rows) is skipped entirely.
- Column picking: header-based. We locate the column whose label matches
  `\bGMP\b` and does NOT contain `listing / issue price / ipo price / lot /
  subscri / %`. This was the biggest historical bug — the scraper used to
  return IPO issue price (e.g. ₹175) instead of GMP (e.g. ₹2).
- Name matching: both sides normalized via lowercase + strip
  `limited|ltd|pvt|private|the|ipo|sme` + strip punctuation. Match if either
  normalized name starts with the other AND overlap ≥ 6 chars. Handles
  "Sai Parenterals" vs "Sai Parenterals Limited".
- Zero-GMP rows (e.g. Adisoft Technologies with `GMP = ₹0`) are intentionally
  parsed as `0`, not dropped. `parseGMP` distinguishes zero from null/empty.
- Admin override: if `ipo.ipowatch_gmp_url` points at a per-IPO article, we
  fall into `parseArticlePage()` which scans every table on the article for
  a GMP-labelled column and returns the first non-null value.
- Contract: never throws. Returns `{ gmp: number } | null`.

### 3b. ipoji — `lib/scraper/sources/gmp-ipoji.ts`

- Listing URL: `https://ipoji.com/grey-market-premium-ipo-gmp-today.html`
- Response from Vercel: 200 OK with desktop UA. Server-rendered grid of
  ~46 live/current IPO cards. This is our **replacement** for the dead
  InvestorGain / IPOCentral sources.
- DOM layout per card:
  ```
  <div class="ipo-card">
    <... title: "Mehul Telecom Apr 17, 2026 – Apr 21, 2026 BSE SME Live">
    <div class="ipo-card-body-stat">
      <span class="ipo-card-secondary-label">Exp. Premium</span>
      <span class="ipo-card-body-value">3-4 (3%)</span>
    </div>
    ...
  </div>
  ```
- Title cleaning: we cut the card title at the first month-name token
  (`Jan|Feb|…|Dec`) before normalizing, because ipoji appends dates and
  status badges (`BSE SME Live`) to the company name.
- Value formats handled:
  `"3-4 (3%)"` → midpoint 3.5; `"10 (5%)"` → 10; `"₹ 5"` → 5; `"-" / "" / "NA"` → null.
- Name matching: same normalization + `namesMatch` helper as IPOWatch, but
  additionally strips `reit` and `invit` tokens.
- Post-close cards (e.g. "Allotment Awaited") legitimately have no
  "Exp. Premium" field — scraper correctly returns `null` in that case.
- Contract: never throws. Returns `{ gmp: number } | null`.

### 3c. Averaging pipeline — `app/api/cron/scrape-gmp/route.ts`

- `SOURCES` array is exactly `[ipowatch, ipoji]`. That's what
  `processIpoGMP` iterates.
- Per source: Redis cache (15 min) → circuit breaker check → scrape → cache
  result. Circuit breaker keys are `gmp-ipowatch` and `gmp-ipoji`.
- Average = mean of non-null sources. If all sources return null, the IPO
  is recorded as `failed` and nothing is written to `gmp_history`.
- `gmp_history` insert uses `upsert(..., { onConflict: "ipo_id,date" })`
  to respect the unique constraint while still updating `recorded_at`.
- `ipos` row is always updated with `gmp_last_updated` even on a no-change
  dedup, so the dashboard's "Last updated" timestamp stays accurate.
- Admin manual trigger
  (`app/api/admin/scrape-gmp/[ipoId]/route.ts`) imports `processIpoGMP`
  directly. No HTTP hop, no re-auth double-up. Returns per-source outcomes
  so the admin UI can show "IPOWatch: 4.5, ipoji: 3.5, averaged: 4.0".

---

## 4. Disabled GMP sources (kept as documentation only)

### 4a. InvestorGain — `gmp-investorgain.ts`

- URL was: `https://www.investorgain.com/report/live-ipo-gmp/331/`
- Verified 2026-04-20: page is now a client-rendered Next.js SPA. Server
  HTML contains zero data rows. `__next_f.push([...])` RSC payloads concat
  to nothing useful. The `webnodejs.investorgain.com/cloud/report/data-read/`
  endpoints return 404 for every path tried.
- Module is left in place for git history and the stored `investorgain_gmp_url`
  column; it is NOT imported from the cron or admin trigger routes.

### 4b. IPOCentral — `gmp-ipocentral.ts`

- URL was: `https://ipocentral.in/ipo-grey-market-premium-today/`
- Verified 2026-04-20: returns HTTP 403 for Vercel egress IPs regardless of
  UA / headers / referer. Cloudflare WAF. Works from consumer browsers.
- Same disposition as InvestorGain: file kept, not imported anywhere live.

If either source comes back to life, add back to the `SOURCES` array in
`app/api/cron/scrape-gmp/route.ts` and re-run the E2E verifier.

---

## 5. Subscription sources

### 5a. NSE — `lib/scraper/sources/subscription-nse.ts`

- Primary source when `nse_symbol` is set on the IPO.
- Relies on `nse-session.ts` warming cookies against `https://www.nseindia.com`
  before each call. Without the warm-up the API returns 401 / empty. Expect
  occasional cookie expiry — surface as failures in scraper_health logs.

### 5b. BSE — `lib/scraper/sources/subscription-bse.ts`

- Primary source when `bse_code` is set. Uses BSE's JSON API
  (`api.bseindia.com/BseIndiaAPI/api/...`). Clean; no known issues.

### 5c. Chittorgarh — `lib/scraper/sources/subscription-chittorgarh.ts`

- Fallback when NSE/BSE aren't configured or return empty.
- URL handling:
  1. If `ipo.chittorgarh_url` matches `/ipo/<slug>/<id>/`, we build the
     sibling `/ipo_subscription/<slug>/<id>/` URL and try that FIRST
     (fewer unrelated tables, cleaner parse).
  2. Then we try the admin-provided URL as-is.
  3. We deliberately do NOT build fallback URLs from slug alone — the
     canonical Chittorgarh URL requires the numeric ID. Returning `null`
     here is correct behavior; the orchestrator falls through.
- Parser strategy:
  - Scan every `<table>`. Include a table only if (a) its header row
    contains `subscri | \btimes\b | oversubscribed | no\. of times`
    OR (b) its caption / preceding heading mentions subscription.
  - Categorize the first-column label into `retail | nii | qib | total`
    via `categorize()`. Supports mainboard/SME labels (`Retail`, `RII`,
    `NII`, `HNI`, `QIB`, `QIB (Ex Anchor)`, `bNII`, `sNII`) AND
    InvIT/REIT labels (`Institutional Investors` → qib,
    `Other Investors` / `Non-Institutional Investors` → nii).
  - Reject noise: `Total Issue Size`, `Shares Offered`, `Shares bid for`,
    `Employee`, `Amount`, `Market Cap`, `Anchor` (unless `Ex-Anchor`).
  - Pick the "times" column preferentially by header; fall back to the
    last plausible numeric cell (skip share counts via `/,\d{3}/` heuristic
    and currency symbols).
- Contract: never throws. Returns
  `{ total, retail, nii, qib } | null` with individual fields nullable.

---

## 6. Shared helpers

- `lib/scraper/base.ts` — `fetchWithRetry`, `logScraperRun`,
  `circuitBreakerCheck`, `circuitBreakerRecordFailure`.
- `lib/scraper/parsers.ts` — `parseGMP`, `parseSubscriptionTimes`, etc.
  `parseGMP("₹0")` → `0`, `parseGMP("-")` → `null`, `parseGMP("")` → `null`.
- `lib/redis.ts` — `cacheGet`, `cacheSet`. TTL of 900s (15 min) used for
  per-source GMP caches.

---

## 7. Admin dashboard URL-override flow

Admin UI: `components/admin/ipo-form.tsx`. Pastes a URL into one of the
`*_url` columns per IPO. The manual-trigger endpoints
(`/api/admin/scrape-{gmp,subscription}/[ipoId]`) always honor these first
before any slug-derived URL.

For currently-disabled sources (InvestorGain, IPOCentral) the stored URL
is ignored at runtime because the source module isn't imported. If we
decide to support manual-URL revival for a dead source, wire it through
a feature-flag check inside the source module — don't add it back to
`SOURCES` unconditionally.

---

## 8. End-to-end verification

Automated in `scripts/verify-scrapers-e2e.ts`. Imports the REAL scraper
modules from `lib/scraper/sources/*` and runs them against live production
websites.

Run it:

```bash
cd /vercel/share/v0-project
set -a && source /vercel/share/.env.project && set +a
pnpm exec tsx scripts/verify-scrapers-e2e.ts
```

Latest passing result (2026-04-20):

```
--- GMP sources (IPOWatch, ipoji) ---
PASS | IPOWatch listing - active SME IPO (Mehul Telecom)           gmp=4.5
PASS | IPOWatch listing - zero-GMP IPO (Adisoft Technologies)      gmp=0
PASS | IPOWatch listing - non-existent IPO (must return null)      gmp=null
PASS | ipoji cards - active SME IPO (Mehul Telecom)                gmp=3.5
PASS | ipoji cards - post-close IPO (PropShare Celestia)           gmp=null

--- Subscription sources (Chittorgarh) ---
PASS | Chittorgarh - no URL configured                             snapshot=null
PASS | Chittorgarh - live mainboard IPO (Citius Transnet InvIT)    total=0.95x

Summary: 7/7 passed
```

Re-run after any change to `gmp-ipowatch.ts`, `gmp-ipoji.ts`, or
`subscription-chittorgarh.ts`. **If a test fails because the underlying
IPO has closed or been withdrawn, update the test fixture, don't "fix" the
scraper.** The live websites are the source of truth; the fixtures are
just convenient shoulders.

---

## 9. Gotchas

- **Absolute paths only** in tool calls: `/vercel/share/v0-project/…`.
- **Never re-run** SQL scripts `006_*.sql` and later — already applied.
- **Cloudflare Worker** runs in V8 isolate — no Node-only imports in any
  file it may ingest.
- **Don't push to `main`.** Always branch off and PR.
- **Zero is a valid GMP.** Don't treat `parseGMP("₹0") === 0` as "no data".
  Check for `null` explicitly.
- **Name normalization threshold is 6 chars.** Below that, false positives
  explode ("ABC" matching "ABC Corp Holdings"). Don't lower it.
- **Chittorgarh ID is non-negotiable.** No ID → no URL → return `null`.
  Don't try to guess `/ipo/<slug>-ipo/` — it 404s.
- **`fetchWithRetry` uses IPOGyaniBot UA by default.** Every live source we
  still use overrides with a desktop Chrome UA. If you add a new source,
  do the same unless you've verified the target accepts bot UAs.

---

## 10. Diagnostic history (archive)

Kept for future agents who want to see what was tried. See also
`diagnosis-SAS4u.md` in the chat attachments for the original
pre-fix audit.

- **2026-04-20 IPOWatch bug:** scraper walked both tables and returned the
  first `₹` value per row. For `["Om Power Transmission", "₹175", "₹2", "₹186"]`
  it returned 175 (IPO price) instead of 2 (GMP). Fixed by parsing only
  the first table and picking the GMP column by header label.
- **2026-04-20 Chittorgarh fallback URL:** old code built
  `/ipo/<slug>-ipo/` without a numeric ID and silently 404'd. Now we prefer
  the admin-provided URL, derive `/ipo_subscription/<slug>/<id>/` from it,
  and return `null` cleanly when neither is available.
- **2026-04-20 InvestorGain / IPOCentral removal:** dropped from `SOURCES`
  array. Module files retained for historical reference. Added ipoji as
  the replacement "third source" to keep the averaging meaningful.
- **2026-04-20 ipoji title parsing:** card titles include trailing dates
  and status badges ("Mehul Telecom Apr 17, 2026 – Apr 21, 2026 BSE SME Live").
  `cleanCardTitle()` cuts at the first month-name token before matching.
- **2026-04-20 E2E harness:** `scripts/verify-scrapers-e2e.ts` added to
  exercise the real scraper code against live sites. 7/7 passing.
