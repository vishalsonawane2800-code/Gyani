# GMP Scraper Handover — next v0 agent

Read `ai_ref/SCRAPER_CONTEXT.md` **first** for the full system overview.
This file documents only the single bug that is in flight right now.

---

## TL;DR for the next agent

**Active bug:** Admin dashboard shows `GMP -` for the live IPO
`citius-transnet-investment-trust-invit-ipo`, with cron message
`"No GMP data yet on sources for 1/1 IPOs: citius-transnet-investment-trust-invit-ipo"`.

**Root cause (confirmed by live probe):** Both sources actually list this
IPO — but under a shorter name:

| Where | Name on page |
|---|---|
| IPOWatch listing HTML | `Citius Transnet InvIT` |
| ipoji listing HTML | `Citius Transnet InvIT` |
| Your DB (`ipos.name`, inferred from slug) | `Citius Transnet Investment Trust InvIT` |

Both scrapers use a local `namesMatch(target, rowName)` helper that is
too strict — when the DB name has extra words (`Investment Trust`) that
the source name doesn't, the match fails and the row is ignored, so the
scraper returns `null` even though the data is right there.

**Fix:** Make `namesMatch` (and/or `normalizeName`) tolerant of
InvIT / REIT / "Investment Trust" boilerplate differences, or more
generally allow a fuzzy subset match, without regressing current
confirmed-good matches.

---

## What's already done on this branch

### 1. Status-classification fix in GMP + subscription crons — DONE (prior agent)

Files changed:
- `app/api/cron/scrape-gmp/route.ts`
- `app/api/cron/scrape-subscription/route.ts`

Both distinguish three outcomes per IPO:
- **got data** → insert / skip as before
- **all sources cleanly returned no_data** → counted as `skipped` with
  reason `no_data_on_sources`, run status = `success`
- **at least one source threw** → `failed`, `scraper_health.error_message`
  records `<slug>: <source1>:<err1>; <source2>:<err2>` (first 5 only)

The orchestrator functions `runGmpScraper` and `runSubscriptionScraper`
return an extra `no_data` field; types updated.

### 2. Dash / N/A / — → 0 — DONE (this session)

Commit: `30ca04d` ("feat(scraper): treat dash/N-A placeholders as 0
after row-match").

Files changed:
- `lib/scraper/parsers.ts` — `parseGMP` now accepts an options bag
  `{ dashAsZero?: boolean }`. Default behaviour is unchanged (empty /
  dash / N/A → `null`, backward compatible). With `dashAsZero: true`,
  the tokens `-`, `--`, `—`, `–`, `N/A`, `NA`, `nil`, `none`,
  `not available` (with optional leading `₹` / `Rs.` / `INR`) all
  return numeric `0`. Truly empty input and `null` always return `null`
  regardless of the flag.
- `lib/scraper/sources/gmp-ipowatch.ts` — the matched-row caller in the
  listing parser AND the article-page row parser both now pass
  `{ dashAsZero: true }`. Applied ONLY AFTER the row has been matched
  by name (so "row missing entirely" still returns `null`).
- `lib/scraper/sources/gmp-ipoji.ts` — the stat-block caller inside the
  matched card passes `{ dashAsZero: true }`. `parseIpojiPremium` also
  now recognises the full placeholder set.
- `scripts/verify-scrapers-e2e.ts` — added 18 parser unit cases; 25/25
  checks pass. The existing live case
  `"IPOWatch listing - zero-GMP IPO (Adisoft Technologies)"` is the
  regression guard for this change — it expects `0`, not `null`.

Sanity: `averageGMP` in `app/api/cron/scrape-gmp/route.ts` uses
`o.gmp !== null && typeof o.gmp === "number"` and preserves `0`. The
Redis cache path uses the same guard. No orchestrator changes needed.

### 3. investorgain.com as a 3rd source — SUPERSEDED (see SCRAPER_CONTEXT.md)

investorgain is now a client-rendered SPA with no SSR data and its
`_next/data/...json` endpoints return 404. **ipoji.com is the live third
source instead** and is already wired into `SOURCES` in the cron route.
Do NOT re-open this task unless investorgain's HTML changes.

---

## The remaining bug — detailed

### Repro (what the user sees)

Admin → Current IPOs:

```
CT  Citius Transnet Investment Trust InvIT
    Open  Mainboard • Rs 99-100 • Closes: 21 Apr
    GMP - Subscription 1.28x AI Pred 3%
```

Admin → Scraper Runs:

```
scrape-gmp   Success   1 item   11757ms
No GMP data yet on sources for 1/1 IPOs:
  citius-transnet-investment-trust-invit-ipo
```

The URL fields (ipowatch/ipocentral/investorgain GMP + sub URLs) all
save correctly. That earlier concern was a UI-screen misread by the
user — no action needed there.

### Evidence this is a name-matching bug, not a no-data bug

Live fetches during this session (both 200 OK):

- `https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/` HTML
  contains `/citius|transnet/i` matches AND multiple `invit` mentions.
- `https://ipoji.com/ipo-list` HTML similarly contains matches.

Both scrapers' end-to-end calls via
`scrapeIPOWatchGMP(name, slug)` / `scrapeIpojiGMP(name, slug)` returned
`{ gmp: null, ... }` with **no thrown errors**, meaning the page was
fetched and parsed OK but `namesMatch(target, rowName)` returned `false`
on every row.

The DB slug `citius-transnet-investment-trust-invit-ipo` implies the
stored `ipos.name` is `"Citius Transnet Investment Trust InvIT"`. On the
sources the row text is just `"Citius Transnet InvIT"`. The extra
`Investment Trust` in the target is what breaks the match.

### Where to fix

Two small helpers live as private functions in each source file:

- `lib/scraper/sources/gmp-ipowatch.ts` — around lines ~55–80 define
  `normalizeName()` and `namesMatch()`. The row parser uses them at
  line ~151 (`if (!namesMatch(normalizedTarget, rowName)) return`).
- `lib/scraper/sources/gmp-ipoji.ts` — same helpers around lines ~53–75
  and the matcher is at line ~168.

Recommended approach (in preference order):

1. **Extract** both local copies into a shared util
   `lib/scraper/name-match.ts` exporting `normalizeName` and
   `namesMatch` so you only need to fix this once. Update both source
   files to import from it.
2. **Add boilerplate stripping** inside `normalizeName` for tokens that
   Indian IPO sites treat interchangeably:
   - `invit`, `invits`
   - `reit`, `reits`
   - `investment trust` → drop
   - `infrastructure investment trust` → drop
   - `limited`, `ltd`, `pvt`, `private`, `ipo`, `the`
   - collapse multiple spaces, lowercase, strip non-alphanumerics
3. **Make `namesMatch` asymmetric-friendly.** After normalization, the
   match should succeed when **the shorter normalized name is a token
   subset of the longer one**, not just on exact equality. Example after
   normalization: target `citius transnet` vs row `citius transnet` →
   exact match, passes. Handle 1-token overlap carefully: require at
   least two meaningful tokens to overlap when names are short, to avoid
   false positives like `"India Cements"` matching `"Cements India"`.
4. **Guard against regressions.** Run
   `pnpm exec tsx scripts/verify-scrapers-e2e.ts` after the change. Every
   existing live case MUST still pass (especially the Adisoft zero-GMP
   guard). Add a new live case for Citius Transnet InvIT asserting a
   numeric GMP comes back from at least one source.

### What NOT to do

- Do NOT widen the match so much that any IPO with shared words
  resolves to another IPO's row. `namesMatch` must stay precise enough
  that e.g. two different SME IPOs with overlapping first words don't
  cross-match.
- Do NOT hard-code "Citius" as a special case.
- Do NOT change `parseGMP` or the `dashAsZero` logic. That landed in
  this session and the orchestrator depends on the current contract.
- Do NOT introduce Playwright/Puppeteer. Vercel serverless has no
  Chromium and `SCRAPER_CONTEXT.md` already rejected that path.

---

## Useful commands / breadcrumbs

```bash
# Full E2E verifier — 25/25 must stay green (18 parser unit cases +
# live source cases). Add a citius case before you call it done.
pnpm exec tsx scripts/verify-scrapers-e2e.ts

# Quick live probe of a specific IPO against both sources (ad-hoc).
# Name variants let you see which ones match and which don't.
cat > scripts/_probe.ts << 'EOF'
import { scrapeIPOWatchGMP } from "@/lib/scraper/sources/gmp-ipowatch"
import { scrapeIpojiGMP } from "@/lib/scraper/sources/gmp-ipoji"
async function main() {
  const slug = "citius-transnet-investment-trust-invit-ipo"
  for (const name of [
    "Citius Transnet Investment Trust InvIT", // DB name (fails today)
    "Citius Transnet InvIT",                  // source name (passes)
  ]) {
    console.log("name:", JSON.stringify(name))
    console.log("  ipowatch:", await scrapeIPOWatchGMP(name, slug))
    console.log("  ipoji   :", await scrapeIpojiGMP(name, slug))
  }
}
main()
EOF
pnpm exec tsx scripts/_probe.ts
# Delete scripts/_probe.ts when done — do NOT leave throwaway scripts
# checked in.

# Full debug-gmp-cron.ts requires prod Supabase creds that are NOT in
# the sandbox env file. Verify via the deployed admin "Run Now" button.
```

---

## Files most likely to touch

- `lib/scraper/sources/gmp-ipowatch.ts` — use shared `namesMatch`
- `lib/scraper/sources/gmp-ipoji.ts` — use shared `namesMatch`
- `lib/scraper/name-match.ts` — **new file**, export `normalizeName` +
  `namesMatch`
- `scripts/verify-scrapers-e2e.ts` — add `Citius Transnet InvIT` case
  (use the DB-style long name `"Citius Transnet Investment Trust InvIT"`
  as the target; expect a numeric value back from at least one source)

## Gotchas

- The admin URL fields (`ipowatch_gmp_url`, `ipocentral_gmp_url`, etc.)
  DO save correctly. Earlier in this session I suspected migration 012
  wasn't run on the connected Supabase, but the user confirmed saves
  work. Leave the form, PATCH route, and schema alone.
- `averageGMP` preserves `0` as a valid numeric value. Do not
  accidentally reintroduce a falsy check like `if (!x)` anywhere in the
  orchestrator or in whatever you add to name-match.
- The `dashAsZero: true` callers MUST stay inside the matched-row block
  only. If you widen name-matching too far, `dashAsZero` could start
  returning `0` for the wrong IPO. Name-match precision matters.
- Prod Supabase creds are not in the sandbox env. Live DB verification
  must happen via the deployed admin dashboard's "Run Now" button.
