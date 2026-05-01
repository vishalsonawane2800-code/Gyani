# Fix: Duplicate rows in "Recently Listed IPOs" (homepage)

## Symptom

On the homepage, the **"Recently Listed IPOs"** section shows the same SME IPO twice on every tab:

- All IPOs tab: Adisoft Technologies (x2), Mehul Telecom (x2)
- SME IPOs tab: Adisoft Technologies (x2), Mehul Telecom (x2)
- Mainboard tab: looks correct (no SME there)

Mainboard listings (Citius Transnet, PropShare Celestia, Om Power) appear only once. Only **SME** rows are duplicated.

## Root cause (one bug, one file)

File: `app/page.tsx`
Function: `getRecentListedIpos()`

```ts
async function getRecentListedIpos(limit = 10): Promise<ListedIPO[]> {
  const years = await getMergedAvailableYearsWithSme();
  const rowsByYear = await Promise.all(
    years.map((y) => getMergedListedIposByYearWithSme(y))
  );
  // ^^^ This already returns mainboard CSV + SME CSV + DB rows merged.

  // Bug: this block ADDS SME rows a SECOND time with no dedupe.
  const smeRowsByYear = await Promise.all(
    years.map((y) => {
      const smeIpos = getListedSmeIposByYear(y);
      return smeIpos.map((ipo) => ({ ...ipo, year: y }));
    })
  );

  const merged = [
    ...rowsByYear.flat(),     // mainboard + SME + DB
    ...smeRowsByYear.flat(),  // SME again (DUPLICATE)
  ]
    .sort(...)
    .slice(0, limit);
  ...
}
```

`getMergedListedIposByYearWithSme()` (in `lib/listed-ipos/loader.ts`) is implemented as:

```ts
const csvRows = getMergedListedIposCsv(year); // = mainboard CSV + SME CSV
const dbRows  = await getListedIposFromDbByYear(year);
// merge with slug-based dedupe between csvRows and dbRows
```

So SME CSV rows are **already inside `rowsByYear`**. Concatenating `smeRowsByYear` produces the duplicates.

## The fix

In `app/page.tsx`, simplify `getRecentListedIpos()` so it does not double-merge SME, and add a defensive dedupe by `(year, slug)` in case the merged loader ever returns dupes from DB vs CSV.

### Step 1 — Edit `app/page.tsx`

Find the `getRecentListedIpos` function (around line 95–125 in the current file). Replace its body with:

```ts
async function getRecentListedIpos(limit = 10): Promise<ListedIPO[]> {
  const years = await getMergedAvailableYearsWithSme();
  const rowsByYear = await Promise.all(
    years.map((y) => getMergedListedIposByYearWithSme(y))
  );

  // Defensive dedupe by (year, slug). The merged loader already dedupes
  // between CSV and DB by slug per year, but we also have multiple years
  // flattening together here. (year, slug) is the canonical detail-page key.
  const seen = new Set<string>();
  const merged = rowsByYear
    .flat()
    .filter((row) => {
      const key = `${row.year}::${row.slug}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.listingDate).getTime() - new Date(a.listingDate).getTime()
    )
    .slice(0, limit);

  // Determine SME status by checking which slugs come from the SME CSV
  // for each year. Used so the UI tab filter shows them under "SME IPOs".
  const smeSlugByYear = new Map<number, Set<string>>();
  for (const y of years) {
    smeSlugByYear.set(
      y,
      new Set(getListedSmeIposByYear(y).map((r) => r.slug))
    );
  }

  return merged.map((row, idx) => {
    const isSme = smeSlugByYear.get(row.year)?.has(row.slug) ?? false;
    return toListedIpoCard(row, idx, isSme);
  });
}
```

The two changes vs. the current code:

1. **Remove the `smeRowsByYear` block entirely** — it was the source of the duplicates.
2. **Add `(year, slug)` dedupe** before sort/slice as defense in depth.

Do not touch `toListedIpoCard`, the imports, or anything else.

### Step 2 — Verify imports are still all used

After the edit, check that `app/page.tsx` no longer needs the `getListedSmeIposByYear` import only if it isn't used elsewhere. It IS still used (inside the new function for the `smeSlugByYear` map), so **keep the import**:

```ts
import { getListedSmeIposByYear } from '@/lib/listed-sme-ipos/loader';
```

Do **not** remove this import.

### Step 3 — Smoke test

1. Reload the homepage.
2. Open "Recently Listed IPOs" section, click each tab:
   - **All IPOs**: Adisoft and Mehul should now each appear once. Total = 6 unique recent IPOs.
   - **Mainboard**: only Citius Transnet, PropShare Celestia, Om Power, etc. Unchanged.
   - **SME IPOs**: Adisoft (1x), Mehul (1x), Safety Controls, Emiac, etc. No dupes.
3. Click any IPO row — the link should still resolve to `/listed/<year>/<slug>` (e.g. `/listed/2026/adisoft-technologies`).

## Out of scope (do NOT touch)

Do not modify any of these unless a separate task explicitly asks for it:

- `lib/listed-ipos/loader.ts` — the merged loaders are correct.
- `lib/listed-sme-ipos/loader.ts` — pure CSV reader, correct.
- `lib/listed-ipos/db.ts` — Supabase adapter, correct.
- `lib/csv-append.ts` — CSV write path used by admin migrate, correct (and already idempotent on `IPO Name`).
- `data/listed-ipos/*` and `data/listed-sme-ipos/*` CSVs — data is fine; only one Adisoft row and one Mehul row in the SME 2026 CSV.
- `components/home/listed-ipos.tsx` — display component, correct. The dedupe must happen at the data layer (server component), not here.
- `app/listed/page.tsx` — separate page, uses CSV-only loaders, unaffected.

## Why this is the right fix (sanity check)

- The 2026 SME CSV (`data/listed-sme-ipos/2026/2026.csv`) contains **one** row for Adisoft Technologies and **one** row for Mehul Telecom. Confirmed.
- The Supabase `listed_ipos` table may or may not also contain those rows (auto-migrated by the day-after-listing cron). The merged loader already dedupes by `slug` between CSV and DB, so even if both have the row it stays single.
- The only remaining duplication source is the redundant `smeRowsByYear` concat in `getRecentListedIpos()`. Removing it eliminates the dupes for all SME IPOs (today and future).
- The added `(year, slug)` dedupe is belt-and-suspenders: protects against any future loader change that might re-introduce per-year duplication.

## Commit message

```
fix(homepage): de-duplicate SME IPOs in Recently Listed section

The merged loader getMergedListedIposByYearWithSme already returns
mainboard CSV + SME CSV + DB rows. Homepage was concatenating SME
rows a second time with no dedupe, causing Adisoft Technologies and
Mehul Telecom to render twice on the All / SME tabs.

- Remove redundant smeRowsByYear concat in getRecentListedIpos.
- Add defensive (year, slug) dedupe before sort/slice.
- No other files changed.
```
