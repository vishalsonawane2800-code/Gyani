# SME & Mainboard IPO Integration Guide

**Date:** April 28, 2026  
**Issue:** SME IPOs were not appearing on listed IPO pages; selecting SME tab caused section to disappear  
**Solution:** Unified loader merges mainboard and SME CSV data across all pages

## Problem Statement

1. **SME IPOs Missing:** Listed IPO pages only loaded mainboard data from `/data/listed-ipos/`
2. **Invisible Section:** When clicking "SME IPOs" tab in "Recently Listed" section, the entire section returned `null` (disappeared)
3. **Separate Data:** SME IPO data existed in `/data/listed-sme-ipos/` but wasn't being fetched

## Solution Architecture

### 1. Unified Loader Functions (`lib/listed-ipos/loader.ts`)

Added new export functions that merge mainboard + SME data:

**CSV-only (build-time):**
```typescript
// Get merged mainboard + SME IPOs for a year (CSV only)
export function getMergedListedIposCsv(year: number): ListedIpoRecord[]

// Get all years that have either mainboard or SME CSV data
export function getAllMergedAvailableYears(): number[]
```

**CSV + DB (runtime, for live IPOs):**
```typescript
// Merge both CSV archives + DB table (CSV wins on conflict)
export async function getMergedListedIposByYearWithSme(year: number): Promise<ListedIpoRecord[]>

// All years from CSV + DB sources
export async function getMergedAvailableYearsWithSme(): Promise<number[]>
```

### 2. Pages Updated to Use Merged Functions

**Files Modified:**
- ✅ `app/listed/[year]/page.tsx` - Uses `getMergedListedIposByYearWithSme()` and `getMergedAvailableYearsWithSme()`
- ✅ `app/listed/page.tsx` - Uses `getMergedListedIposCsv()` and `getAllMergedAvailableYears()`
- ✅ `app/page.tsx` - Home page uses SME-aware loaders for "Recently Listed" section

**Impact:** Listed IPO pages now display both mainboard and SME IPOs together

### 3. Component Fixed

**`components/home/listed-ipos.tsx`:**
- **Removed:** Early `return null` when filtered results were empty (caused invisible section on tab switch)
- **Added:** Empty state message instead: "No SME IPOs listed yet" vs "No recent listed IPOs available"
- **Result:** Section stays visible even when filtering to empty category

### 4. CSV Data Flow

When an admin adds listing day data for an IPO:

1. IPO status moves to `listed` in Supabase
2. Data upserted to `listed_ipos` DB table (temporary staging)
3. **CSV append triggered:** `appendToListedCsv()` from `lib/csv-append.ts`
4. Function detects exchange type (SME vs Mainboard)
5. Appends row to correct folder:
   - Mainboard → `/data/listed-ipos/<year>/<year>.csv`
   - SME → `/data/listed-sme-ipos/<year>/<year>.csv`

**CSV Structure:** Both folders use identical column layouts (from `_template.csv`), so the same parser handles both.

## File Structure

```
data/
├── listed-ipos/
│   ├── README.md
│   ├── _template.csv
│   └── 2026/
│       └── 2026.csv (Mainboard IPOs)
└── listed-sme-ipos/
    ├── README.md
    ├── _template.csv
    └── 2026/
        └── 2026.csv (SME IPOs)

lib/
├── listed-ipos/
│   ├── loader.ts (NEW: functions for merged data)
│   ├── _parse.ts (shared CSV parser)
│   └── db.ts (DB queries)
└── listed-sme-ipos/
    └── loader.ts (original SME-specific loader)
```

## Data Flow Summary

### Listed IPO Pages

```
[User visits /listed/2026]
    ↓
[getMergedListedIposByYearWithSme(2026)]
    ├→ Load from /data/listed-ipos/2026/2026.csv
    ├→ Load from /data/listed-sme-ipos/2026/2026.csv
    └→ Load from Supabase listed_ipos table
    ↓
[Merge & sort by listing date descending]
    ↓
[ArchiveTable displays all IPOs with tabs: All / Mainboard / SME]
```

### Home Page - Recently Listed

```
[User visits /]
    ↓
[getRecentListedIpos(10)]
    ├→ Get all years from CSV + DB
    ├→ For each year: fetch merged data (mainboard + SME)
    └→ Take 10 most recent across all years
    ↓
[ListedIPOs component with tabs]
    ├→ All tab: show all 10 recent
    ├→ Mainboard tab: filter to mainboard only
    └→ SME tab: filter to SME only (empty state if none)
```

## Testing Checklist

- [ ] Navigate to `/listed` - should show both mainboard and SME years
- [ ] Click on a year - should show both mainboard and SME IPOs with counts
- [ ] Visit home page - "Recently Listed" should have 3 tabs working
- [ ] Click "SME IPOs" tab - should show message if empty, or SME data if available
- [ ] Add new SME IPO via admin → set listing date → should appear in both `/listed` and home page
- [ ] Verify CSV append works for both `/data/listed-ipos/` and `/data/listed-sme-ipos/`

## Next Steps

1. **Backfill SME data:** Add any historical SME IPOs to `/data/listed-sme-ipos/2026/2026.csv`
2. **Verify exchange detection:** Ensure `isos.exchange` contains "SME" in the name for SME IPOs
3. **Monitor CSV appends:** After listing any SME IPO, verify it appears in `/data/listed-sme-ipos/` CSV file

## Rollback

If issues arise, revert to mainboard-only by:
1. Changing imports back to original functions (without `WithSme` suffix)
2. This will hide all SME data until functions are restored
