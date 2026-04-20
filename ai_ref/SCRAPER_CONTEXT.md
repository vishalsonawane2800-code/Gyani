# Scraper Context & Handoff Notes

> Handoff doc for the next agent. Contains everything I verified by running live
> HTTP requests against the real sources from the Vercel sandbox, plus the
> concrete bugs I found in our current scraper code and the fix plan.
>
> Branch: `scraper-bug-fixes` (off `main`)
> Date of investigation: 2026-04-20

---

## 1. How the scraping system is wired

```
Vercel Cron (hourly)
  └─> /api/cron/scrape-gmp           ─┐
  └─> /api/cron/scrape-subscription  ─┤── Node runtime, runs on Vercel
                                      │
                                      │  fetch() to each source
                                      ▼
                       lib/scraper/sources/*.ts
                       ├── gmp-investorgain.ts     (listing page)
                       ├── gmp-ipowatch.ts         (listing page)
                       ├── gmp-ipocentral.ts       (listing page)
                       ├── subscription-chittorgarh.ts (per-IPO page)
                       ├── subscription-nse.ts     (NSE JSON API + cookies)
                       ├── subscription-bse.ts     (BSE JSON API)
                       └── nse-session.ts          (cookie warm-up)

Admin manual trigger (per IPO):
  /api/admin/scrape-gmp/[ipoId]
  /api/admin/scrape-subscription/[ipoId]

Cloudflare Worker (cloudflare-worker/):
  Separate deployment. Used as a proxy / fallback for some sources that block
  Vercel egress IPs. Keep in mind any code here has to either work on Vercel
  OR be called via the worker.
```

### Source URL overrides (admin-provided)
IPO rows in Supabase have per-source URL columns that an admin can fill in from
the admin dashboard. When present, the scraper MUST use the admin URL instead
of guessing one from the slug:

- `chittorgarh_url`          — Chittorgarh IPO detail page
- `ipowatch_url`             — IPOWatch GMP article
- `investorgain_url`         — InvestorGain IPO detail page
- `ipocentral_url`           — IPOCentral IPO detail page
- `nse_symbol` / `bse_code`  — for NSE/BSE subscription APIs

SQL that added these lives in `scripts/003_*.sql`, `scripts/012_*.sql`.
**Rule:** Always prefer the admin-provided URL. Only fall back to
slug-built URL if the override is empty.

### Supabase connection
Supabase is on a different account from ~`scripts/006_*.sql` onward. Those SQL
scripts have already been executed by the user against that project. Do not
re-run them. Only add NEW numbered scripts.

---

## 2. Database shape (relevant columns)

Table `ipos`:
- `id`, `name`, `slug`
- `status` — 'upcoming' | 'open' | 'closed' | 'listed'
- `open_date`, `close_date`, `listing_date`
- `chittorgarh_url`, `ipowatch_url`, `investorgain_url`, `ipocentral_url`
- `nse_symbol`, `bse_code`
- `current_gmp`, `gmp_updated_at`
- `subscription_retail`, `subscription_nii`, `subscription_qib`, `subscription_total`
- `subscription_updated_at`

Table `gmp_history`: time-series of `{ipo_id, source, gmp, recorded_at}`
Table `subscription_history`: time-series of `{ipo_id, source, retail, nii, qib, total, recorded_at}`

For full details see `DATABASE_SCHEMA.md`.

---

## 3. Per-source findings (verified 2026-04-20)

I ran real fetches with a desktop Chrome UA to each source. Summary:

| Source          | Status from Vercel | Issues found                                         |
|-----------------|--------------------|------------------------------------------------------|
| IPOWatch        | WORKING, BUGGY     | Picks wrong column; parses historical table too      |
| InvestorGain    | **DEAD** (SPA)     | Client-side only, raw HTML has no data rows          |
| IPOCentral      | **DEAD** (403)     | Cloudflare WAF blocks Vercel egress IPs              |
| Chittorgarh     | WORKING            | Parser OK but URL fallback is wrong when no ID       |
| NSE subscription| Likely working     | Relies on cookie warm-up in `nse-session.ts`         |
| BSE subscription| Working            | Clean JSON API                                       |

### 3a. IPOWatch — `https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/`

**Structure of the page:**
- Table 0 = **"Current Live GMP"**, ~6 rows.
  Headers: `[IPO Name, Open Date, Close Date, Price, Lot, GMP, Listing]`
- Table 1 = **"Historical Listed IPOs"**, ~272 rows.
  Headers: `[Company, IPO Price, GMP on Listing, Listing Price, ...]`

**Bug in `lib/scraper/sources/gmp-ipowatch.ts`:**
1. Code iterates `$("table tr")` — walks EVERY row of BOTH tables. So a match
   against a listed/historical IPO returns listing-day GMP, not today's GMP.
2. For each row it picks the **first `₹` value** it finds. In the historical
   table that cell is the IPO issue price (e.g. `₹175`), not GMP.
   Example broken row:
   ```
   ["Om Power Transmission", "₹175", "₹2", "₹186"]
                                ^^^^^ returned as GMP, actually IPO price
                                        ^^^ real GMP
   ```
3. Name matching uses raw `.includes()` / equality. IPO row text says
   "Sai Parenterals" but DB has "Sai Parenterals Limited" — miss.

**Fix plan:**
- Only walk the FIRST table (the live one). Detect it by header containing
  "Open" + "Close" + "GMP" and NOT "Listing Price".
- Use header row to find the column whose label matches `/\bGMP\b/i` (and NOT
  `issue price`/`ipo price`/`listing`).
- Normalize names: lowercase, strip punctuation, strip suffixes
  (`limited|ltd|pvt|private|the|ipo|sme`), collapse whitespace. Match if
  `norm(rowName).startsWith(norm(dbName))` OR vice versa.
- When an admin provides `ipowatch_url` pointing to a per-IPO article instead
  of the listing, parse the article body for the first "GMP ₹<num>" phrase
  after the most recent date, as a per-IPO path.

### 3b. InvestorGain — `https://www.investorgain.com/report/live-ipo-gmp/331/`

**Verified live:**
- Response is ~350KB of HTML but the body has essentially no data. There's
  exactly ONE empty `<table>`, no `<tr>` children, zero `₹` signs in actual
  content (only in sidebar broker ads).
- `__next_f.push([...])` RSC payloads concat to ~0 chars of meaningful IPO data
  — this page is now a client-only Next.js SPA with data fetched post-hydration.
- Tried direct detail URLs like `/ipo/sai-parenterals-ipo/7842/` — same story,
  client-rendered.
- Tried `webnodejs.investorgain.com/cloud/report/data-read/331/…` patterns
  — all 404.

**Decision:** InvestorGain is DEAD from server-side fetch. Options:
1. Remove it from `SOURCES` in `lib/scraper/sources/gmp-investorgain.ts` so
   `scrape-gmp` stops averaging in `null` for it.
2. OR delegate to the Cloudflare Worker with a headless-browser fetch (adds
   cost + complexity; not done yet).

The user asked us to **drop dead sources from the averaged GMP entirely** — so
implement option 1. Keep the file but make the scraper function return `null`
fast with a clear log, AND remove it from the average source array used by
`app/api/cron/scrape-gmp/route.ts`.

### 3c. IPOCentral — `https://ipocentral.in/ipo-grey-market-premium-today/`

**Verified live:** Returns **HTTP 403** with any desktop UA, full browser-style
headers, or referer. It's Cloudflare WAF blocking Vercel/sandbox IPs. Browser
in user's laptop works but our server does not.

**Decision:** Same as InvestorGain — drop from average. Return `null` fast so
we don't spam logs with fetch errors.

### 3d. Chittorgarh — subscription scraper

**Two URL shapes work:**
1. `https://www.chittorgarh.com/ipo/<slug>-ipo/<id>/`
   — has subscription table among MANY other tables
2. `https://www.chittorgarh.com/ipo_subscription/<slug>-ipo/<id>/`  ← cleaner
   — dedicated subscription page, fewer tables to filter through

Both need the numeric ID. If `chittorgarh_url` is null and we only have a slug,
building `/ipo/<slug>-ipo/` (no ID) 404s. Current code does exactly this and
silently fails.

**Table we want:**
Headers look like:
`["Category", "Subscription (times)", "Shares Offered", "Shares bid for", "Total Amount (Rs Cr)"]`
Rows (label column, cell 0):
`QIB`, `NII`, `bNII (bids above ₹10L)`, `sNII (bids below ₹10L)`, `Retail`,
`Employee`, `Total`.

**Existing parser in `lib/scraper/sources/subscription-chittorgarh.ts` is
CORRECT** — it categorizes labels and picks the "times" column. Bug is purely
at the URL/fetch level.

**Fix plan:**
1. If admin-supplied `chittorgarh_url` exists, use it as-is.
2. Else if we have `<slug>` + a numeric ID stored somewhere (we don't, today),
   use `/ipo_subscription/<slug>-ipo/<id>/`.
3. Else attempt to resolve the ID once by scraping the main dashboard
   (`/ipo/ipo_dashboard.asp`) or `/ipo/` listing, and cache it into
   `chittorgarh_url` so subsequent runs don't re-resolve.

### 3e. NSE / BSE subscription

- **NSE**: `lib/scraper/sources/subscription-nse.ts` uses `nse-session.ts` to
  warm up cookies from `https://www.nseindia.com`. Without the warm-up the NSE
  API returns 401/empty. The logic is correct; watch for cookie expiry in logs.
- **BSE**: `lib/scraper/sources/subscription-bse.ts` just hits
  `api.bseindia.com/BseIndiaAPI/api/GetIPODetails/...` (or equivalent). Clean
  JSON. No known bugs.

---

## 4. Other live discoveries

- Chittorgarh **does** work from Vercel. Full desktop UA is enough. No WAF.
- `cheerio.load(html)` is fine. The problem was always table / column
  selection, not HTML fetching.
- All sources respond under 2s from the sandbox except IPOCentral (instant 403)
  and InvestorGain (~1.5s but no useful payload).
- InvestorGain's fallback endpoint format is
  `webnodejs.investorgain.com/cloud/report/data-read/<reportId>/...` but
  reportId 331 with every tried path combination returns 404. Don't sink more
  time into this unless their API is publicly documented.

---

## 5. Concrete changes the next agent should make

The user has approved the following scope:

1. **Fix IPOWatch GMP scraper** (biggest win)
   - File: `lib/scraper/sources/gmp-ipowatch.ts`
   - Only parse the FIRST table ("Current Live GMP"). Detect by header.
   - Use header row to pick the GMP column by label, not row index.
   - Normalize both sides for name matching as described in §3a.
   - Respect admin-provided `ipowatch_url` (may point at a per-IPO article).

2. **Drop InvestorGain and IPOCentral from the averaged GMP**
   - File: `app/api/cron/scrape-gmp/route.ts`
   - Remove them from the SOURCES array (or gate behind a feature flag).
   - Leave the source files in place but make their `scrape*()` functions
     return `null` quickly with a single warn-level log and no error.
   - Same in `app/api/admin/scrape-gmp/[ipoId]/route.ts`.

3. **Improve Chittorgarh subscription scraper**
   - File: `lib/scraper/sources/subscription-chittorgarh.ts`
   - Always prefer admin `chittorgarh_url`.
   - When falling back, prefer `/ipo_subscription/<slug>/<id>/` shape.
   - Do NOT attempt URLs without the numeric id (they 404).
   - Keep the existing correct parser logic.

4. **Write SCRAPER_CONTEXT.md** (this file) — done.

5. **Optional (stretch):** Add 1–2 new GMP sources that work from Vercel. Any
   of these is worth prototyping:
   - `https://www.moneycontrol.com/ipo/` — Moneycontrol renders server-side.
   - `https://www.topsharebrokers.com/report/ipo-grey-market-premium/` — static
     HTML tables.
   - `https://ipoji.com/grey-market-premium-ipo-gmp-today.html` — static table.
   Verify from Vercel with a `curl -A "Mozilla/5.0…"` equivalent before
   committing to any.

---

## 6. How to validate a fix locally

Use this quick script pattern:

```js
// scripts/test-one-source.mjs
import * as cheerio from "cheerio"
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const r = await fetch("<URL_UNDER_TEST>", { headers: { "User-Agent": UA } })
const html = await r.text()
console.log("status", r.status, "size", html.length)
const $ = cheerio.load(html)
// inspect $("table"), $("tr"), headers, etc.
```

Run with `node scripts/test-one-source.mjs`. Already existing test harness
scripts live in `scripts/test-live-scrapers.mjs`, `scripts/test-ch-sub.mjs`,
`scripts/test-ig-rsc.mjs`, etc. — reuse or delete as appropriate.

---

## 7. Admin dashboard URL override flow (important)

The admin UI lets users paste a URL for each source per IPO in the IPO form
(`components/admin/ipo-form.tsx`). These URLs are stored as the `*_url` columns
on `ipos`. The manual-trigger admin endpoints
(`/api/admin/scrape-{gmp,subscription}/[ipoId]`) should always honor these
overrides first before any auto-URL derivation.

If a source is declared DEAD (InvestorGain, IPOCentral) the admin UI should
either:
- hide the field, or
- still accept it but skip that source in cron unless the admin URL is non-null
  (so a clever admin can unblock per IPO).

For the initial fix, hiding/skipping is fine. Keep the column in the schema.

---

## 8. Gotchas for the next agent

- **Always use absolute paths** in the tool calls (`/vercel/share/v0-project/...`).
- **Don't re-run SQL scripts** `006_*.sql` and later — user's Supabase already
  has those applied.
- **Cloudflare Worker** (`cloudflare-worker/`) is a separate deployment. Any
  shared logic you want usable from both needs to live in a plain `.ts` file
  with no Node-only imports (the worker runs in Cloudflare's V8 isolate).
- The current working branch is `scraper-bug-fixes`. Don't push to `main`.
- After changes, run `pnpm build` locally if possible to catch type errors
  before committing.
- `cheerio` is already a dep. No new packages needed for any of the fixes.

---

## 9. Test matrix (what the next agent should verify before declaring done)

- [ ] IPOWatch: for a known live IPO, scraper returns the correct GMP from the
      first table, not the IPO issue price from the historical table.
- [ ] IPOWatch: an IPO with name mismatch (e.g. "Sai Parenterals" vs
      "Sai Parenterals Limited") is correctly matched.
- [ ] InvestorGain cron call returns `null` in <200ms with a warn log, no
      unhandled exception, and does NOT drag down the averaged GMP.
- [ ] IPOCentral cron call returns `null` fast on 403 with a single warn log.
- [ ] Chittorgarh subscription scraper works when only `chittorgarh_url` is
      provided, and also when slug+id are provided.
- [ ] `/api/cron/scrape-gmp` completes end-to-end without error for a small
      sample (use `curl` with the CRON_SECRET header once deployed, or run the
      function locally).
- [ ] `/api/cron/scrape-subscription` completes for the same sample.
