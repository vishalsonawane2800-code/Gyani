# IPOCentral → ipoji Migration Summary

## Overview
This migration replaces the non-functional IPOCentral source with ipoji as the active GMP scraper source. IPOCentral is blocked by Cloudflare WAF and returns 403 for all cloud IPs, making it unusable. ipoji is now the active replacement.

## Changes Made

### 1. Database Schema (Migration 013)
**File**: `scripts/013_replace_ipocentral_with_ipoji.sql`

- Added new `ipoji_gmp_url` column to `ipos` table
- Migrates data from `ipocentral_gmp_url` → `ipoji_gmp_url` (if exists)
- Drops old `idx_ipos_ipocentral_gmp_url` index
- Creates new `idx_ipos_ipoji_gmp_url` index
- Marks `ipocentral_gmp_url` as deprecated with comments

### 2. Frontend: Admin Form
**File**: `components/admin/ipo-form.tsx`

**Changes**:
- Interface: Renamed `ipocentral_gmp_url: string` → `ipoji_gmp_url: string`
- Defaults: Updated `ipocentral_gmp_url: ''` → `ipoji_gmp_url: ''`
- Form Field (line ~920):
  - Label: "IPOCentral GMP URL" → "ipoji GMP URL"
  - Input ID & name: Updated to `ipoji_gmp_url`
  - Placeholder: Updated to ipoji URL format
  - Description: Updated to clarify ipoji is the active replacement

### 3. Admin Pages
**Files**:
- `app/admin/ipos/[id]/edit/page.tsx` - Updated form data mapping
- `app/api/admin/ipos/route.ts` - Updated POST endpoint to accept `ipoji_gmp_url`
- `app/api/admin/ipos/[id]/route.ts` - Updated PUT endpoint to handle `ipoji_gmp_url`
- `app/api/admin/scrape-gmp/[ipoId]/route.ts` - Updated SELECT query

### 4. GMP Scraper
**File**: `app/api/cron/scrape-gmp/route.ts`

**Changes**:
- Updated type definition: `ipocentral_gmp_url: string | null` → `ipoji_gmp_url: string | null`
- Updated database SELECT query to fetch `ipoji_gmp_url` instead of `ipocentral_gmp_url`
- Updated comments to clarify ipoji is the active replacement
- Scraper logic already supports ipoji as an active source (no changes needed)

### 5. Legacy Code Cleanup
**Files NOT changed** (kept for backward compatibility):
- `lib/scraper/sources/gmp-ipocentral.ts` - Source file kept but unused
- Database column `ipocentral_gmp_url` - Kept but marked as deprecated

## Migration Steps

### Step 1: Run Database Migration
Run in Supabase SQL editor:
```sql
-- Copy and paste the contents of: scripts/013_replace_ipocentral_with_ipoji.sql
```

### Step 2: Verify Migration
Run this query to confirm migration success:
```sql
-- Copy and paste the contents of: scripts/verify_ipoji_migration.sql
```

Expected output:
- `with_ipoji` should equal `with_ipocentral` (all data migrated)
- `idx_ipos_ipoji_gmp_url` index should exist
- `ipocentral_gmp_url` column should still exist (for backward compat)

### Step 3: Deploy Code Changes
The code changes are backward compatible and will work before/after the migration:
- If `ipoji_gmp_url` column exists in DB, it will be used
- If only `ipocentral_gmp_url` exists, the scraper will still work (falls back to ipoji listing page)

## Scraper Behavior After Migration

The GMP scraper will continue to use these sources in order:
1. **IPOWatch Article** (per-IPO override URL if configured in `ipowatch_gmp_url`)
2. **IPOWatch Listing** (constant listing page)
3. **ipoji** (GMP listing page - now active, replaces InvestorGain/IPOCentral)

Per-IPO URLs:
- `ipowatch_gmp_url`: Optional direct IPOWatch article URL
- `ipoji_gmp_url`: Optional direct ipoji URL (NEW - replaces ipocentral)
- `investorgain_gmp_url`: Legacy (source disabled)
- `ipocentral_gmp_url`: Legacy (source disabled - use ipoji_gmp_url instead)

## Testing

### Local Testing
```bash
# Test that form compiles
npm run build

# Test scraper with manual trigger
curl -X POST http://localhost:3000/api/admin/scrape-gmp/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Production Testing
1. Verify GMP data is being scraped for current IPOs
2. Check `/admin/automation` logs to see ipoji source stats
3. Confirm averaging is working correctly with both IPOWatch + ipoji

## Backward Compatibility

✅ **Fully backward compatible**:
- Old `ipocentral_gmp_url` URLs still stored in database
- Code doesn't try to scrape them (source is disabled)
- If column doesn't exist yet, code gracefully handles it
- Can be deployed before or after DB migration

## Files Modified

```
components/admin/ipo-form.tsx              (3 changes)
app/admin/ipos/[id]/edit/page.tsx          (1 change)
app/api/admin/ipos/route.ts                (1 change)
app/api/admin/ipos/[id]/route.ts           (1 change)
app/api/admin/scrape-gmp/[ipoId]/route.ts  (1 change)
app/api/cron/scrape-gmp/route.ts           (3 changes)

scripts/013_replace_ipocentral_with_ipoji.sql  (NEW)
scripts/verify_ipoji_migration.sql             (NEW - for verification)
```

## Next Steps

1. Run migration script in Supabase
2. Run verification script to confirm
3. Deploy code changes
4. Monitor GMP scraper logs to confirm ipoji data is being captured
5. Check admin dashboard to see per-source stats

## Rollback (if needed)

If issues occur, the migration can be reversed by:
```sql
-- Revert to using ipocentral_gmp_url in code
-- Drop ipoji_gmp_url column if needed
-- Restore ipocentral_gmp_url index
```

However, since ipoji is the only working source, reverting won't restore IPOCentral functionality—it was already broken.
