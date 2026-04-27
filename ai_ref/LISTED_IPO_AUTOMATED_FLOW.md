# Listed IPO Migration — Complete Automated System

## Overview

When an IPO lists, the complete system flow is **fully automated**:

1. **Admin enters listing day data** via the admin form
2. **Auto-status cron detects** when listing day arrives
3. **`migrateIpoToListed()` migrates** IPO to Supabase `listed_ipos` table
4. **CSV automatically appends** the IPO row to the correct CSV file (Mainboard or SME)
5. **Pages revalidate** so the IPO immediately appears in `/listed/<year>`
6. **Build-time parsing** pre-renders all listing detail pages

---

## System Architecture

### 1. Admin Form Entry

**File:** `components/admin/ipo-form.tsx`

**Location:** "Listing Day Data" section (lines ~884-897 in original)

**Required fields to unlock migration:**
- `listing_price` (required) — Opening price on listing day
- `list_day_close` (optional) — Closing price on listing day
- `list_day_change_pct` (optional) — Day 1 → Day 2 change percentage

**When saved:**
- Updates `ipos` table with these fields
- Does NOT trigger migration immediately (waits for auto-status cron)

### 2. Auto-Status Cron Detection

**File:** `app/api/admin/auto-status/route.ts`

**Trigger condition:**
```
IF status === 'listing' 
AND today (IST) === listing_date (IST)
AND listing_price is set
THEN transition to 'listed' and call migrateIpoToListed()
```

**Frequency:** Every 15 minutes (via Cloudflare Worker cron)

**Time zone:** IST (Asia/Kolkata) — all date comparisons use IST

### 3. Database Migration

**File:** `app/api/admin/ipos/[id]/migrate-listed/route.ts`

**Function:** `migrateIpoToListed(id: number | string): Promise<MigrateResult>`

**Steps:**
1. Fetch IPO row from `ipos` table
2. Validate `listing_price != null` (gate)
3. Transform columns to `listed_ipos` schema
4. Upsert into `listed_ipos` by slug (idempotent)
5. Update source `ipos.status = 'listed'` to prevent re-migration
6. **NEW:** Append row to CSV file
7. Revalidate `/listed` pages

**Return value includes:**
```ts
{
  ok: true,
  alreadyListed: boolean,
  data: ListedIPOData,
  csvAppend: {
    success: boolean,
    message: string,
    filePath?: string
  }
}
```

### 4. CSV Automatic Append

**File:** `lib/csv-append.ts`

**Function:** `appendToListedCsv(year: number, isSme: boolean, row: ListedIPORow)`

**What it does:**
1. Determines correct CSV path based on exchange:
   - **SME:** `/data/listed-sme-ipos/<year>/<year>.csv`
   - **Mainboard:** `/data/listed-ipos/<year>/<year>.csv`

2. Creates year directory if it doesn't exist

3. Reads existing CSV (if file exists)

4. Checks for duplicate IPO (by name) — skips if already present

5. Formats IPO row data:
   - null values → empty string
   - strings with commas → quoted and escaped
   - numbers → as-is

6. Appends new row with newline

7. Atomically writes file back

**Columns populated:**
- ✅ IPO Name, Listing Date, Sector
- ✅ Retail Quota, Issue Price, Listing Price
- ✅ Subscription (QIB, NII, Retail, Total)
- ✅ Listing Gain %, Market Sentiment Score
- ✅ Issue Size, Fresh Issue, OFS
- ✅ GMP (last value), AI Prediction, Prediction Accuracy
- ⚠️ Closing Price, Day-by-day GMP, Peer PE, etc. — left empty (manual fill)

**Idempotency:**
- Uses IPO name as unique key
- If IPO already exists, append is skipped
- Re-running migration doesn't create duplicate CSV rows

### 5. Page Revalidation

**File:** Same route, post-append

**Paths revalidated:**
- `/listed` (main index)
- `/listed/<year>` (year archive)
- `/listed/<year>/<slug>` (individual IPO detail)

**Effect:** Pages are immediately marked as stale, next request re-renders them

### 6. Build-Time Static Page Generation

**Files:** 
- `app/listed/[year]/page.tsx`
- `app/listed/[year]/[slug]/page.tsx`

**How it works:**
1. `generateStaticParams()` calls the CSV loaders
2. Parsers in `lib/listed-ipos/_parse.ts` and `lib/listed-sme-ipos/loader.ts` read CSV files
3. Each row becomes a `ListedIpoRecord` object
4. Pages are pre-rendered at build time (static + ISR)
5. Zero runtime database cost for `/listed` pages

---

## Complete Data Flow Diagram

```
┌──────────────────────────────────────┐
│ Admin fills Listing Price in Form    │
└─────────────┬────────────────────────┘
              │ (saves to ipos table)
              ▼
┌──────────────────────────────────────┐
│ ipos.listing_price = 153             │
│ ipos.status = 'listing'              │
│ ipos.listing_date = '2026-04-24'     │
└─────────────┬────────────────────────┘
              │
              │ (15 mins later, cron runs)
              ▼
┌──────────────────────────────────────┐
│ Auto-Status Cron: /api/admin/auto-   │
│ status checks: today === listing_date│
│ AND listing_price set                │
└─────────────┬────────────────────────┘
              │ (YES: conditions met)
              ▼
┌──────────────────────────────────────┐
│ Status transitions:                  │
│ 'listing' → 'listed'                 │
│ Calls migrateIpoToListed()           │
└─────────────┬────────────────────────┘
              │
              ├─────────────┬──────────────┐
              │             │              │
              ▼             ▼              ▼
        ┌────────────┐ ┌────────┐  ┌──────────────┐
        │ Supabase:  │ │CSV     │  │Revalidate    │
        │listed_ipos │ │Append  │  │/listed/*     │
        │upsert      │ │        │  │              │
        └────────────┘ └────────┘  └──────────────┘
              │             │              │
              └─────────────┼──────────────┘
                            ▼
                ┌────────────────────────┐
                │ Next build (ISR):      │
                │ CSV parsed             │
                │ /listed/<year>/        │
                │ <slug> pre-rendered    │
                │ with full data         │
                └────────────────────────┘
                            ▼
                ┌────────────────────────┐
                │ User visits            │
                │ /listed/2026/          │
                │ mehul-telecom-ltd      │
                │                        │
                │ Sees complete IPO data:│
                │ - Subscription numbers │
                │ - GMP trend            │
                │ - Listing gain %       │
                │ - AI prediction        │
                │ - Market context       │
                └────────────────────────┘
```

---

## File Structure After Migration

### Supabase (Live Data)
```
ipos (source table)
  ├─ id: 3
  ├─ company_name: "Mehul Telecom Limited"
  ├─ status: "listed" (changed from "listing")
  ├─ listing_price: 108 (filled by admin)
  └─ [all other fields preserved]

listed_ipos (destination table, Upserted)
  ├─ original_ipo_id: 3
  ├─ name: "Mehul Telecom Limited"
  ├─ slug: "mehul-telecom-limited-ipo"
  ├─ list_price: 108
  ├─ gain_pct: 10.20 (calculated)
  ├─ sub_times: 44.91
  ├─ ai_pred: "10.2%"
  ├─ ai_err: 0.0 (calculated)
  └─ year: "2026"
```

### CSV Archive
```
/data/listed-ipos/2026/2026.csv
├─ Header row (43 columns)
└─ Data rows:
   └─ Mehul Telecom Limited,2026-04-24,Mobile Retail,35,98,108,,,10.20,,44.91,44.91,44.91,,,44.91,,,,,,,25.5,0.8,62.0,156.8,1.12,5.2,8.1,12.4,3.5,78,1000,700,300,12,,,,,10-15%,10.2%,0.0

/data/listed-sme-ipos/2026/2026.csv
├─ Header row (43 columns)
└─ (SME IPOs appended here if applicable)
```

### Static Pages
```
/listed/2026/
  └─ index (pre-rendered year archive)

/listed/2026/mehul-telecom-limited-ipo/
  └─ detail page (pre-rendered with CSV data)
```

---

## Example Walkthrough: Apsis Aerocom Listed

### Day of Listing: 18-03-2026

**Admin actions:**
1. Opens `/admin/ipos/5/edit` (Apsis Aerocom)
2. Scrolls to "Listing Day Data" section
3. Enters:
   - Listing Price: 153
   - Closing Price: 160
   - Day Change: +4.6%
4. Clicks "Save IPO"

**System updates:**
```sql
UPDATE ipos
SET listing_price = 153,
    list_day_close = 160,
    list_day_change_pct = 4.6
WHERE id = 5;
```

### Day After Listing: 19-03-2026 (10:00 IST)

**Auto-status cron runs:**
```
Check: today (2026-03-19) === listing_date (2026-03-18)? NO → skip
Wait...
```

**Auto-status cron runs (later, once 19-03 rolls over in IST):**
```
Check: today (2026-03-19) > listing_date (2026-03-18)
       AND listing_price (153) is set? YES
       AND status === 'listing'? YES
       
→ Transition to 'listed' and call migrateIpoToListed(5)
```

**Migration function runs:**

1. **Supabase upsert:**
```sql
INSERT INTO listed_ipos (
  original_ipo_id, name, slug, list_price, listing_price, gain_pct, year, ...
)
VALUES (
  5, 'Apsis Aerocom', 'apsis-aerocom-ipo', 153, 153, 39.09, '2026', ...
)
ON CONFLICT(slug) DO UPDATE SET ...;
```

2. **CSV append:**
```csv
Apsis Aerocom Ltd,18-03-2026,Aerospace,50,110,153,160,39.09,45.45,4.6,3.65,1.66,1.05,1.92,,,44.91,,,,,,,25.5,0.8,28.5,450,1.12,5.2,8.1,12.4,3.5,78,550,400,150,12,,,,,10-15%,36.4%,3.26
```

3. **Status update:**
```sql
UPDATE ipos SET status = 'listed' WHERE id = 5;
```

4. **Revalidate paths:**
- `/listed` (main archive)
- `/listed/2026` (2026 archive)
- `/listed/2026/apsis-aerocom-ipo` (detail page)

### Next Build

**CSV parser runs:**
- Reads `/data/listed-ipos/2026/2026.csv`
- Parses all rows including Apsis Aerocom
- Pre-renders `/listed/2026` (sortable table)
- Pre-renders `/listed/2026/apsis-aerocom-ipo` (detail page)

**Static pages go live** with complete data.

---

## CSV Column Reference

All 43 columns in order:

```
1. IPO Name
2. Listing Date
3. Sector
4. Retail Quota (%)
5. Issue Price Upper
6. Listing Price (Rs)
7. Closing Price NSE
8. Listing Gain (%)
9. Listing gains on closing Basis (%)
10. Day Change After Listing (%)
11. QIB Day3 Subscription
12. HNI/NII Day3 Subscription
13. Retail Day3 Subscription
14. Day1 Subscription
15. Day2 Subscription
16. Day3 Subscription
17. GMP percentage D1
18. GMP percentage D2
19. GMP percentage D3
20. GMP percentage D4
21. GMP percentage D5
22. Peer PE
23. Debt/Equity
24. IPO PE
25. Latest EBIDTA
26. PE vs Sector Ratio
27. Nifty 3D Return (%)
28. Nifty 1W Return (%)
29. Nifty 1M Return (%)
30. Nifty During IPO Window (%)
31. Market Sentiment Score
32. Issue Size (Rs Cr)
33. Fresh Issue
34. OFS
35. GMP Day-1
36. GMP Day-2
37. GMP Day-3
38. GMP Day-4
39. GMP Day-5
40. GMP Prediction
41. IPOGyani AI Prediction
42. Prediction Accuracy (%)
```

**Auto-populated on migration (columns 1-6, 8, 10-13, 16, 24, 31-34, 40-42):**
- IPO Name, Listing Date, Sector
- Issue Price, Listing Price
- Listing Gain (calculated)
- Subscription numbers
- Sentiment Score (if in Supabase)
- Issue Size, Fresh Issue, OFS
- GMP Prediction, AI Prediction, Accuracy

**Manual fill (columns 7, 9, 14-15, 17-23, 25-30, 35-39):**
- Closing Price
- Listing Gain at close
- Historical subscription by day
- Daily GMP values and percentages
- Financial ratios
- Market returns during IPO window

---

## Testing the Automated Flow

### Test 1: Manual Migration Trigger
```bash
curl -X POST http://localhost:3000/api/admin/ipos/5/migrate-listed

# Response includes csvAppend status:
{
  "message": "IPO successfully migrated to listed directory",
  "data": { ... },
  "csvAppend": {
    "success": true,
    "message": "Successfully appended \"Mehul Telecom Limited\" to Mainboard CSV for 2026",
    "filePath": "/data/listed-ipos/2026/2026.csv"
  }
}
```

### Test 2: Verify CSV Row
```bash
tail -1 /data/listed-ipos/2026/2026.csv

# Should output the new row with all populated columns
```

### Test 3: Check Supabase
```sql
SELECT slug, name, gain_pct, list_price, year
FROM listed_ipos
WHERE original_ipo_id = 5;

-- Should show:
-- slug: "mehul-telecom-limited-ipo"
-- name: "Mehul Telecom Limited"
-- gain_pct: 10.20
-- list_price: 108
-- year: "2026"
```

### Test 4: Verify Pages Exist
```bash
# Check that static pages were pre-rendered
ls -la /vercel/share/v0-project/.next/static/pages/listed/2026/

# Should include: index.html and mehul-telecom-limited-ipo.html
```

---

## Error Handling

### CSV Append Fails
**Reason:** Directory doesn't exist or file write permission denied

**Result:** Migration still succeeds (Supabase data is primary)

**Resolution:** Check `/data/listed-ipos/<year>/` exists with write permissions

### IPO Already in CSV
**Reason:** IPO name matches existing row

**Result:** Skip append, return `success: false` with message "already exists"

**Resolution:** Check CSV for duplicate, remove manually if needed

### Null listing_price
**Reason:** Admin didn't fill in listing price

**Result:** Migration blocked, return `reason: 'no_list_price'`

**Resolution:** Admin must fill "Listing Price" field and save form

---

## Summary for Future Agents

**When an IPO lists:**

1. ✅ Admin fills listing_price → Auto-saved to Supabase
2. ✅ Auto-status cron detects listing day → Calls migrate function
3. ✅ `migrateIpoToListed()` → Upserts to listed_ipos table
4. ✅ CSV auto-appends → Row added to year-specific CSV file
5. ✅ Pages revalidate → ISR picks up changes
6. ✅ Build-time parsing → Creates static pages with complete data
7. ✅ IPO goes live → `/listed/<year>/<slug>` is ready to serve

**No manual CSV editing required.** The system is fully automated.

