# IPO Auto-Migration to Listed IPOs - Fix Documentation

**Date:** April 30, 2026  
**Issue:** When admin marks an IPO as listed and adds the listing price, the IPO was not being automatically migrated to the listed_ipos CSV files (SME.csv or Mainboard.csv) and the dashboard was not updating.

## Root Causes Identified

1. **No automatic migration trigger**: When `listing_price` was saved to the database, there was no follow-up call to migrate the IPO to the listed_ipos CSV
2. **Incorrect CSV file selection**: The migration endpoint was writing to a generic `${year}.csv` instead of `SME.csv` or `Mainboard.csv` based on the exchange type
3. **Missing status update**: After migration, the IPO status in the database wasn't being updated to "listed"

## Solution Implemented

### 1. Auto-Migration Trigger in IPO Form (`components/admin/ipo-form.tsx`)

Added automatic migration logic to the form submission handler (lines 329-366):
- Triggers when `listing_price` is set and status is 'listing' or 'listed'
- Calls `/api/admin/migrate-to-listed` endpoint with IPO data
- Provides user feedback via toast notifications
- Gracefully handles migration failures without blocking IPO save

```typescript
// After saving IPO, if conditions are met:
// 1. listing_price is set (> 0)
// 2. status is 'listing' or 'listed'
// 3. listing_date is set
// → Auto-trigger migration
```

### 2. Fixed CSV Path Logic in Migration Endpoint (`app/api/admin/migrate-to-listed/route.ts`)

Updated the CSV file selection logic (lines 82-92):
- Determines if IPO is SME based on `exchange` field (contains "SME")
- Writes to `SME.csv` for SME IPOs (`BSE SME`, `NSE SME`)
- Writes to `Mainboard.csv` for mainboard IPOs (`Mainboard`, `REIT`)
- Creates year directory if it doesn't exist

```typescript
const isSME = ipo.exchange?.includes('SME') ?? false
const csvFileName = isSME ? 'SME.csv' : 'Mainboard.csv'
const csvPath = path.join(..., String(year), csvFileName)
```

### 3. Post-Migration Status Update

Added database update after CSV migration (lines 171-175):
- Updates IPO status to 'listed' if not already
- Ensures database and CSV are in sync

```typescript
if (ipo.status !== 'listed') {
  await supabase.from('ipos').update({ status: 'listed' }).eq('id', ipoId)
}
```

## Workflow After Fix

1. **Admin opens IPO edit page** (`/admin/ipos/[id]/edit`)
2. **Admin enters listing price** in the "Listing Day Data" section
3. **Admin saves IPO** (clicking Save button)
4. **Form submission handler checks:**
   - Is listing_price set? ✓
   - Is status 'listing' or 'listed'? ✓
   - Is listing_date set? ✓
5. **If all checks pass:**
   - IPO is saved to database
   - Auto-migration is triggered to `/api/admin/migrate-to-listed`
   - IPO is added to appropriate CSV (SME.csv or Mainboard.csv)
   - IPO status in database is updated to 'listed'
6. **Dashboard automatically reflects change:**
   - Admin page shows IPO with "listed" status
   - Dashboard stats update (Mainboard Listed count increases)
   - Listed IPO appears in the listed IPOs dashboard (Mainboard/SME tabs)

## Files Modified

1. **components/admin/ipo-form.tsx** - Added auto-migration trigger in handleSubmit
2. **app/api/admin/migrate-to-listed/route.ts** - Fixed CSV path and added status update

## Testing Workflow

1. Create or edit an existing upcoming IPO
2. Set status to 'listing' or 'listed'
3. Set a listing_date
4. Set a listing_price (e.g., 125.50)
5. Click Save
6. Check `/data/listed-ipos/2026/SME.csv` or `/data/listed-ipos/2026/Mainboard.csv` for the new row
7. Verify the IPO status is now 'listed' in admin dashboard
8. Verify dashboard stats show the count updated (Mainboard Listed or SME Listed)

## Migration Response

The endpoint returns:
```json
{
  "success": true,
  "message": "Successfully migrated [IPO Name] to listed IPOs",
  "data": {
    "name": "[IPO Name]",
    "listingDate": "[Date]",
    "listingPrice": [Price],
    "listingGain": "[Gain %]",
    "totalSubscription": "[Subscription]",
    "csvPath": "/data/listed-ipos/2026/[SME or Mainboard].csv",
    "exchange": "[Exchange]",
    "isSME": [boolean]
  }
}
```

## Error Handling

- If migration fails but IPO is saved: User sees warning toast "IPO saved, but migration to listed failed. You can retry from admin dashboard."
- Migration failure doesn't block IPO save - IPO is still updated in database
- Detailed error logs in server console for debugging
