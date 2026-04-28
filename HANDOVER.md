# Handover Document - IPO Data Integration

## Current Status

The project is building a dynamic IPO listing page at `https://ipogyani.com/listed/2026/mehul-telecom-limited-ipo` with two main data sources:

1. **Listed IPOs** - Historical IPOs with complete data (CSV + optional Supabase)
2. **Expected Soon IPOs** - Upcoming IPOs without dates announced (223 companies from Excel sheet)

## What Was Done This Session

### 1. Added Mehul Telecom Limited IPO (2026)
- **File**: `/vercel/share/v0-project/data/listed-ipos/2026/2026.csv`
- **Data Added**: Static IPO entry with:
  - Company: Mehul Telecom Limited
  - Listing Date: 24-04-2026
  - Sector: Mobile Retail
  - Open Price: Rs 98
  - Close Price: Rs 108
  - Listing High: Rs 114.25
  - Listing Low: Rs 96
  - Issue Size: Rs 500 Cr
  - Subscriptions: 44.91x
  - Listing Gain: 10.20%
  - Custom Slug: `mehul-telecom-limited-ipo` (for URL matching)

**Note**: Added `Slug` column to CSV parser to support custom slugs that don't auto-slugify from company name.

### 2. Created Expected Soon IPOs Infrastructure
- **File**: `/vercel/share/v0-project/data/expected-soon-ipos/2026.csv`
  - Copied from user's Excel sheet: 223 upcoming IPOs
  - Columns: Company, Sector, Exchange, Expected Size, Timeframe, Note
  
- **File**: `/vercel/share/v0-project/lib/expected-soon-ipos/loader.ts`
  - New loader module for expected-soon IPOs
  - Supports server-side pagination (15 items per page)
  - Fallback from Supabase to CSV if DB unavailable

- **File**: `/vercel/share/v0-project/app/upcoming/page.tsx`
  - Updated to display paginated "Expected Soon" section
  - Added pagination controls with `searchParams`
  - Shows 15 IPOs per page with next/previous navigation

### 3. Code Modifications
- **File**: `/vercel/share/v0-project/lib/listed-ipos/_parse.ts`
  - Made `parseCsvRows()` function exportable
  - Added optional `Slug` column support to CSV parser
  - Falls back to `slugify(name)` if Slug column is empty

## What Needs To Be Done (Next Agent)

### CRITICAL - Setup Supabase with New Account

The app currently tries to query Supabase first, then falls back to CSV. **You MUST set up the database schema** on the newly linked Supabase account:

#### Step 1: Create Table Schema (Run in Supabase SQL Editor)
```sql
-- File: scripts/001_create_ipo_tables.sql
-- Execute this in your Supabase SQL editor
```

#### Step 2: Seed Listed IPOs Table (2026 data)
```sql
-- File: scripts/002_seed_listed_ipos.sql
-- Run after creating tables
```

#### Step 3: Create Expected Soon IPOs Table
```sql
-- File: scripts/003_seed_expected_soon_ipos.sql
-- This needs to be GENERATED (see below)
```

### Generate Expected Soon SQL

Run this command to generate the SQL from the CSV:
```bash
cd /vercel/share/v0-project
node scripts/gen-expected-soon-sql.mjs > scripts/003_seed_expected_soon_ipos.sql
```

This will create SQL INSERT statements for all 223 expected-soon IPOs.

### Step 4: Update Environment Variables

Verify these are set in Vercel project settings (Settings → Vars):
- `NEXT_PUBLIC_SUPABASE_URL` - Your new Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your new Supabase public key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for admin operations)

### Step 5: Test the Pages

After setting up Supabase:

1. **Test Listed IPO Page**:
   ```
   /listed/2026/mehul-telecom-limited-ipo
   ```
   Should show all Mehul Telecom data from the CSV

2. **Test Upcoming/Expected Soon Page**:
   ```
   /upcoming?page=1
   ```
   Should show 15 expected-soon IPOs with pagination controls

3. **Test Pagination**:
   - Check `/upcoming?page=2`, `/upcoming?page=3`, etc.
   - Verify 223 total IPOs are loaded (15 per page = 15 pages)

## File Structure

```
/vercel/share/v0-project/
├── data/
│   ├── listed-ipos/
│   │   └── 2026/
│   │       ├── 2026.csv (← UPDATED with Mehul Telecom + Slug column)
│   │       └── [other IPO files]
│   └── expected-soon-ipos/
│       └── 2026.csv (← NEW - 223 upcoming IPOs)
├── lib/
│   ├── listed-ipos/
│   │   ├── loader.ts (existing)
│   │   ├── _parse.ts (← MODIFIED - added Slug support)
│   │   └── db.ts (existing)
│   └── expected-soon-ipos/
│       └── loader.ts (← NEW)
├── app/
│   └── upcoming/
│       └── page.tsx (← MODIFIED - added pagination)
└── scripts/
    ├── gen-expected-soon-sql.mjs (← NEW - SQL generator)
    ├── 001_create_ipo_tables.sql (existing)
    ├── 002_seed_listed_ipos.sql (existing)
    └── 003_seed_expected_soon_ipos.sql (← NEEDS TO BE GENERATED)
```

## Key Data Format Notes

### Listed IPOs CSV (2026.csv)
- **41 columns** total
- Key columns: IPO Name, Listing Date, Sector, Exchange, Open Price, Close Price, Listing High, Listing Low, Issue Size, Subscriptions, Listing Gain, etc.
- **Slug column** (NEW): Optional custom slug override. If empty, uses `slugify(IPO Name)`
- Mehul Telecom example: Slug = `mehul-telecom-limited-ipo`

### Expected Soon IPOs CSV (2026.csv in expected-soon-ipos/)
- **6 columns**: Company, Sector, Exchange, Expected Size, Timeframe, Note
- All 223 records from user's Excel sheet

## Known Issues / TODO

1. **❌ Mehul Telecom page returns 404**
   - Cause: Supabase not configured → loader tries DB query → fails silently
   - Fix: Complete Supabase setup (above steps)
   - CSV fallback should work once DB queries stop throwing errors

2. **⚠️ Pagination Not Tested**
   - Expected Soon page will work with CSV fallback
   - Need to verify pagination UI displays correctly after Supabase setup

3. **📝 Missing: Type Definitions**
   - Consider adding TypeScript types for `ExpectedSoonIPO` interface in `lib/expected-soon-ipos/types.ts`
   - Add types for pagination state

## Testing Checklist for Next Agent

- [ ] Supabase account linked to new project
- [ ] SQL schema created (001_create_ipo_tables.sql)
- [ ] Listed IPOs seeded (002_seed_listed_ipos.sql)
- [ ] Expected Soon IPOs seeded (003_seed_expected_soon_sql - must generate)
- [ ] Environment variables updated in Vercel
- [ ] `/listed/2026/mehul-telecom-limited-ipo` shows data (not 404)
- [ ] `/upcoming` shows page 1 with 15 IPOs
- [ ] Pagination links work (`?page=2`, `?page=3`, etc.)
- [ ] All 223 expected-soon IPOs accessible via pagination
- [ ] Styling matches existing design system

## Useful Commands

```bash
# Generate Expected Soon SQL from CSV
cd /vercel/share/v0-project
node scripts/gen-expected-soon-sql.mjs > scripts/003_seed_expected_soon_ipos.sql

# Check CSV parsing
node scripts/debug-csv.mjs

# Test if Supabase is working
npm run dev  # Watch logs for any Supabase connection errors

# Count records in CSV
wc -l data/expected-soon-ipos/2026.csv  # Should be 224 (1 header + 223 data)
wc -l data/listed-ipos/2026/2026.csv    # Check column consistency
```

## Contact Points

- **GitHub Repo**: `chhayasonawane5723-cloud/gyani3`
- **Current Branch**: `add-ipo-data` (submit PR to `main`)
- **Vercel Project**: `prj_ASYJhELK4QLUnHzUAwyn9gw3kEd8`
- **Vercel Team**: `team_aTnLc5GSAtEYLzzUNTNUMBXN`

## Summary

✅ **Completed**:
- Added Mehul Telecom Limited IPO with static data to 2026.csv
- Created loader and page infrastructure for Expected Soon IPOs (223 companies)
- Added pagination support to upcoming page
- Modified CSV parser to support custom slugs

⏳ **Blocked** (waiting for credits / Supabase setup):
- Supabase schema creation
- Expected Soon SQL generation and seeding
- Testing the full integrated flow

Once Supabase is linked with the new account, the next agent should:
1. Run the SQL scripts to create tables and seed data
2. Generate and run the expected-soon SQL
3. Test both pages and verify pagination works

Good luck! 🚀
