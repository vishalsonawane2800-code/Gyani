# Listed IPOs Handover Guide

> **Created:** May 1, 2026
> **Purpose:** Complete technical documentation for the "Recently Listed IPOs" section on homepage and the `/listed` archive page
> **For:** Next AI agent and developers working on listed IPO features

---

## Table of Contents

1. [Overview](#overview)
2. [Components](#components)
3. [Data Flow](#data-flow)
4. [Pages & Routes](#pages--routes)
5. [Key Files](#key-files)
6. [Issue Resolution](#issue-resolution)
7. [Common Tasks](#common-tasks)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Listed IPOs feature consists of two main sections:

### 1. "Recently Listed IPOs" (Homepage)
- **Location:** Homepage section below GMP Tracker
- **Component:** `components/home/listed-ipos.tsx`
- **Shows:** Last 6 listed IPOs (all exchanges: mainboard, SME, REIT, InvIT)
- **Display:** Clean table with columns: IPO Name, List Date, Issue Price, List Price, Listing Gain, AI Prediction, Subscription
- **Links to:** Individual IPO detail pages at `/listed/[year]/[slug]`

### 2. Listed IPO Archive (`/listed`)
- **Location:** `/app/listed/page.tsx`
- **Shows:** Archive organized by year with statistics
- **Cards display:** Total IPOs per year, count of positive listings, average gain %
- **Links to:** Year pages at `/listed/[year]` showing full IPO tables

---

## Components

### 1. `components/home/listed-ipos.tsx` (Client Component)

**Purpose:** Display recently listed IPOs on homepage

**Props:**
```typescript
interface ListedIPOsProps {
  listedIpos: ListedIPO[];
}
```

**Key Logic:**
- Sorts IPOs by `listDate` descending
- Takes the most recent 6 entries
- Renders a responsive table
- Calculates color-coded listing gain badges (green for positive, red for negative)
- Links to detail pages using dynamic year calculation

**Important Note:** Previously had SME/Mainboard/All tabs that have been **removed**. Now shows unified "recent" view without filtering.

**Data transformation:**
```typescript
function toListedIpoCard(
  row: ListedIpoRecord,
  index: number,
  isSme: boolean
): ListedIPO {
  return {
    id: index + 1,
    name: row.name,
    slug: row.slug,
    exchange: isSme ? 'NSE SME' : 'NSE',
    listDate: row.listingDate,
    issuePrice: row.issuePriceUpper ?? 0,
    listPrice: row.listingPrice ?? 0,
    gainPct: row.listingGainPct ?? 0,
    // ... other fields
  };
}
```

### 2. `app/listed/page.tsx` (Server Component)

**Purpose:** Listed IPO archive landing page

**Renders:**
1. Archive year grid with statistics
2. SEO content about the archive
3. Popular search terms

**Data gathering:**
```typescript
const archiveYears = getAllMergedAvailableYears();
const archiveYearStats = archiveYears.map((y) => {
  const rows = getMergedListedIposCsv(y);
  const total = rows.length;
  const positive = rows.filter((r) => (r.listingGainPct ?? 0) > 0).length;
  const avgGain = total > 0 ? rows.reduce(...) / total : 0;
  return { year: y, total, positive, avgGain };
});
```

### 3. Year Pages: `app/listed/[year]/page.tsx`

**Purpose:** Display all IPOs for a specific year

**Features:**
- Full IPO table with all columns
- Filters + sorting
- Responsive design

**Route Parameters:** `[year]` is a number string (e.g., "2024")

### 4. Detail Pages: `app/listed/[year]/[slug]/page.tsx`

**Purpose:** Single IPO detail page (not covered in this handover; see separate docs)

**Data Fetching:** Via `getMergedListedIpo(year, slug)` from CSV first, then DB

---

## Data Flow

### Homepage to "Recently Listed IPOs" Display

```
┌─────────────────────────────────────────────────────────────┐
│ app/page.tsx (Server Component - RSC)                       │
│  - force-dynamic = true (always fresh data)                │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├─> getRecentListedIpos(10)
                  │    │
                  │    ├─> getMergedAvailableYearsWithSme()
                  │    │    └─> Returns sorted years [2026, 2025, 2024, ...]
                  │    │
                  │    ├─> For each year: getMergedListedIposByYearWithSme(y)
                  │    │    │
                  │    │    ├─> Reads CSV from data/listed-ipos/<year>.csv
                  │    │    ├─> Fetches DB rows from listed_ipos table
                  │    │    ├─> Merges CSV + DB (CSV wins on collision)
                  │    │    └─> Returns merged records
                  │    │
                  │    ├─> Also: getListedSmeIposByYear(y) for SME IPOs
                  │    │
                  │    ├─> Combines mainboard + SME
                  │    ├─> Sorts by listingDate (newest first)
                  │    └─> Returns top 10 as ListedIPO[]
                  │
                  └─> Pass listedIpos to <ListedIPOs /> component
                       │
                       └─> Component:
                            ├─ Sort by listDate DESC
                            ├─ Take first 6
                            └─ Render table
```

### CSV First, DB Second

The system prioritizes CSV data over database:

1. **CSV Source:** `data/listed-ipos/<year>.csv`
   - Committed to git
   - Contains ~40 enrichment columns
   - Historical archive (2024, 2025, 2026, etc.)
   - Updated manually via Excel/CSV processes

2. **DB Source:** `listed_ipos` table
   - Auto-populated via migration when IPO transitions to `listed` status
   - Triggered by `runAutoStatusJob()` in dispatcher cron
   - Happens day-after listing when `listing_price IS NOT NULL`

3. **Merge Logic** (in `lib/listed-ipos/loader.ts`):
   ```typescript
   export async function getMergedListedIposByYear(year: number): Promise<ListedIpoRecord[]> {
     const csvRows = getListedIposByYear(year);  // Sync, cached
     const dbRows = await getListedIposByYearFromDb(year);  // Async, Supabase
     
     const merged = [...csvRows];
     const csvSlugs = new Set(csvRows.map(r => r.slug));
     
     // Add DB rows that aren't in CSV
     for (const row of dbRows) {
       if (!csvSlugs.has(row.slug)) {
         merged.push(row);
       }
     }
     
     return merged.sort((a, b) => 
       new Date(b.listingDate).getTime() - new Date(a.listingDate).getTime()
     );
   }
   ```

---

## Pages & Routes

### Public Routes

| Route | Component | Purpose | ISR? |
|-------|-----------|---------|------|
| `GET /` | `app/page.tsx` | Homepage | No (force-dynamic) |
| `GET /listed` | `app/listed/page.tsx` | Archive index | No |
| `GET /listed/[year]` | `app/listed/[year]/page.tsx` | Year archive | Yes (3600s) |
| `GET /listed/[year]/[slug]` | `app/listed/[year]/[slug]/page.tsx` | IPO detail | Yes (3600s) |

### Revalidation Strategy

**ISR (Incremental Static Regeneration):**
- Year pages and detail pages are cached for **3600 seconds** (1 hour)
- `dynamicParams = true` allows on-demand generation for new years/slugs
- Within the 1-hour window, users see cached content
- After 1 hour, Next.js regenerates in background

**Manual Revalidation:**
When an IPO is manually migrated to `listed`:

```typescript
// app/api/admin/ipos/[id]/migrate-listed/route.ts
export async function POST(request: Request, { params }: { params: { id: string } }) {
  // ... migration logic ...
  
  // Immediately refresh affected paths
  try {
    revalidatePath('/listed');
    revalidatePath(`/listed/${year}`);
    revalidatePath(`/listed/${year}/${slug}`);
  } catch (err) {
    // Ignore - ISR will pick up within 1 hour anyway
  }
  
  return Response.json({ success: true });
}
```

---

## Key Files

### Loaders & Data Fetchers

| File | Purpose |
|------|---------|
| `lib/listed-ipos/loader.ts` | CSV parsing + merging logic |
| `lib/listed-ipos/db.ts` | Supabase queries for `listed_ipos` table |
| `lib/listed-sme-ipos/loader.ts` | SME CSV parser (parallel to mainboard) |
| `lib/data.ts` | Core types: `ListedIPO`, `ListedIpoRecord`, etc. |

### Components

| File | Type | Purpose |
|------|------|---------|
| `components/home/listed-ipos.tsx` | Client | Homepage section |
| `components/listed/listed-hero.tsx` | Server | Archive page hero |
| `components/listed/listed-table.tsx` | Client | Full year IPO table |
| `components/listed/listed-filters.tsx` | Client | Table filters/sorting |

### Pages

| File | Type | Purpose |
|------|------|---------|
| `app/page.tsx` | Server | Homepage (RSC, force-dynamic) |
| `app/listed/page.tsx` | Server | Archive index |
| `app/listed/[year]/page.tsx` | Server | Year archive (ISR) |
| `app/listed/[year]/[slug]/page.tsx` | Server | IPO detail (ISR) |

### Database Schema

| Table | Purpose |
|-------|---------|
| `listed_ipos` | Archive of migrated IPOs (DB half) |
| `ipos` | Current IPOs (status transitions to `listed`) |

See `ai_ref/DATABASE_SCHEMA.md` for full schema.

---

## Issue Resolution

### The Problem (from User Feedback)

> "The user used the v0 interface to revert back to version 3. It has been copied into a new version... the Recently Listed IPOs section looks messy and mixing SME with mainboard was confusing"

### What Was Changed

1. **Removed SME/Mainboard/All tabs** from the "Recently Listed IPOs" component
   - Previously: `<button onClick={() => setActiveTab('sme')}>SME IPOs</button>` etc.
   - Now: Single, unified table showing the 6 most recent IPOs across all exchanges

2. **Kept dedicated `/sme` and `/mainboard` pages** for users who want to filter by exchange
   - `app/sme/page.tsx` — SME IPOs only
   - `app/mainboard/page.tsx` — Mainboard IPOs only (created in recent session)
   - `app/listed/page.tsx` — Archive for all types by year

3. **Simplified the "Recently Listed" display:**
   - No client-side state management (was using `useState` for activeTab)
   - No conditional rendering based on exchange
   - Direct sorting by date → take 6 → render

### Why This Fix Works

- **Homepage is cleaner:** Shows "Recently Listed IPOs" (recent + mixed) without confusing category switches
- **Users seeking specifics have dedicated pages:** Want SME IPOs? Go to `/sme`. Want mainboard? Go to `/mainboard`.
- **Archive still searchable by year:** `/listed` shows all years, each year shows all IPOs with stats
- **Performance improved:** Removed `useEffect` + `useState`, component is now purely presentational

---

## Common Tasks

### Task 1: Add a new listed IPO to the homepage

**Scenario:** An IPO just listed. You want it to appear in "Recently Listed IPOs" on the homepage.

**Steps:**

1. **Wait for auto-migration** (if it's a DB IPO):
   - The `runAutoStatusJob()` runs every 15 minutes
   - If IPO has `listing_price` set and `status = 'listing'`, it auto-migrates to `listed_ipos` table
   - Triggers `revalidatePath('/listed')` etc.

2. **Or manually migrate** (if needed):
   - Admin → IPOs → [Select IPO] → [Migrate to Listed button]
   - Manually enters listing price, list price, listing gain %
   - Hits `/api/admin/ipos/[id]/migrate-listed`
   - Triggers revalidation

3. **Verify in "Recently Listed IPOs":**
   - Homepage fetches top 10 via `getRecentListedIpos(10)`
   - Component takes first 6 and renders
   - Should appear in table within seconds (if migration was manual) or within 1 hour (if ISR cache expires)

### Task 2: Update an IPO's listing gain % after it listed

**Scenario:** Listing gain % was initially entered incorrectly.

**Steps:**

1. Go to `/admin/ipos/[id]` (IPO editor)
2. Find the IPO in the `listed_ipos` table (or scroll to "Listed IPO" section in the form)
3. Update `listing_gain_percent` field
4. Save
5. Next.js ISR cache expires in ~1 hour, or manually revalidate

### Task 3: Display SME vs Mainboard IPOs separately

**Current structure:**
- Mainboard IPOs: `/listed/[year]` shows all exchange types (Mainboard, SME, REIT, InvIT)
- SME IPOs only: `/sme` page (separate route)

**If you need to filter by exchange in the archive:**

1. Add a filter component to `app/listed/[year]/page.tsx`:
   ```typescript
   'use client'
   
   const [exchange, setExchange] = useState('all');
   const filtered = rows.filter(r =>
     exchange === 'all' || r.exchange === exchange
   );
   ```

2. Or link to `/listed?exchange=NSE%20SME` and parse query params

### Task 4: Fix "Recently Listed" not updating after a migration

**If you just migrated an IPO to `listed` but it doesn't appear:**

1. **Check ISR cache:** 
   - Homepage page cache TTL is 3600s (1 hour) unless `force-dynamic` is set
   - `app/page.tsx` has `export const dynamic = 'force-dynamic'`, so it should always be fresh

2. **Check the migration:**
   - Did the API call succeed? Check network tab
   - Did `revalidatePath()` complete? (No error should appear, but it might fail silently in cron context)

3. **Manual revalidate:**
   - Visit `/api/revalidate` endpoint (if it exists)
   - Or wait 1 hour for ISR

4. **Check database:**
   - Query `listed_ipos` table: `SELECT * FROM listed_ipos WHERE slug = '...'`
   - Confirm row exists and has correct data

---

## Troubleshooting

### Issue: "Recently Listed IPOs" table shows no data

**Causes:**
1. No IPOs have transitioned to `listed` status yet
2. CSV files are missing or unreadable
3. Database query failed silently

**Debug:**
```typescript
// Add to app/page.tsx temporarily
const listedIpos = await getRecentListedIpos(10);
console.log('[v0] getRecentListedIpos returned:', listedIpos);
```

**Fix:**
- Ensure at least one IPO exists in `data/listed-ipos/<year>.csv` or `listed_ipos` table
- Check file permissions on CSV files
- Verify Supabase connection (see `lib/supabase/server.ts`)

### Issue: "Recently Listed IPOs" shows old data even after migration

**Causes:**
1. ISR cache hasn't expired (1 hour window)
2. `revalidatePath()` failed (can't be called from cron context)

**Fix:**
```typescript
// If on a route handler (not cron):
import { revalidatePath } from 'next/cache';
revalidatePath('/');  // Revalidate homepage
```

### Issue: SME and Mainboard IPOs mixed in the homepage section

**This is intentional.** The homepage shows "Recently Listed IPOs" — a unified recent view.

If you want separate sections:
1. Create new sections: `<RecentSmeIPOs />` and `<RecentMainboardIPOs />`
2. Filter data in homepage before passing to components
3. Or create separate URLs: `/recent-sme`, `/recent-mainboard`

### Issue: Detail page at `/listed/[year]/[slug]` returns 404

**Causes:**
1. IPO slug doesn't match (case-sensitive)
2. CSV/DB doesn't have the IPO
3. Year is wrong

**Debug:**
```typescript
// In app/listed/[year]/[slug]/page.tsx
const ipo = await getMergedListedIpo(year, slug);
if (!ipo) {
  console.log(`[v0] IPO not found: ${year}/${slug}`);
  console.log(`[v0] Available slugs for year ${year}:`, 
    (await getMergedListedIposByYear(parseInt(year))).map(r => r.slug)
  );
}
```

---

## Next Steps for AI Agent

1. **If fixing bugs:** Check the "Issue Resolution" section above — it documents the recent refactor
2. **If adding features:** Follow the data flow diagram to understand where to hook in
3. **If refactoring:** Keep the CSV-first + DB-merge strategy; don't switch to DB-only
4. **If creating new pages:** Use `getMergedListedIposByYear()` to fetch data (not CSV alone)

---

## Related Documentation

- `AI_CODEBASE_GUIDE.md` §4.2 — Listed IPO data sources & rendering strategy
- `DATABASE_SCHEMA.md` §2.9 — `listed_ipos` table schema
- `lib/listed-ipos/loader.ts` — Implementation details
- `components/home/listed-ipos.tsx` — Component code

---

**Last Updated:** May 1, 2026
**Status:** Complete & ready for next agent
