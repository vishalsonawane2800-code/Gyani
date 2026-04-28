# Subscription Data Debugging Guide

## Issue: Only Total Subscription Data Available

For some IPOs like **Amba Auto Ltd** and **Auto IPO**, the subscription tracker only shows the `total` subscription multiplier (e.g., "0.15x") without the category breakdown (Retail, NII, QIB).

### Root Cause Analysis

The subscription scraper (`/lib/scraper/sources/subscription-chittorgarh.ts`) parses Chittorgarh's IPO pages to extract subscription data. The `categorize()` function maps table row labels to four buckets:
- **Retail**
- **NII** (Non-Institutional Investors / HNI)
- **QIB** (Qualified Institutional Buyers)
- **Total**

**Why Amba/Auto only show total:**

1. **Table structure mismatch** - The Chittorgarh page for these IPOs may have a single-row table with only a "Total" row, no category rows
2. **Header parsing failure** - The table headers might not match expected subscription signals (`subscription`, `times`, `oversubscribed`)
3. **Missing category labels** - Row labels don't match the regex patterns in `categorize()` function (e.g., localized text, abbreviated labels)

### How to Debug

1. **Check the actual Chittorgarh page:**
   - Visit the URL stored in `ipos.chittorgarh_url` for the problem IPO
   - Look for the subscription table structure
   - Inspect row labels and column headers

2. **Enable debug logging:**
   - Add console logs in `parseFromHtml()` to print detected tables and row categorization
   - Temporarily expose parser output for manual inspection

3. **Check subscription_live table:**
   ```sql
   SELECT * FROM subscription_live 
   WHERE ipo_id IN (
     SELECT id FROM ipos WHERE slug IN ('amba-auto-ltd-ipo', 'your-ipo-slug')
   )
   ORDER BY updated_at DESC
   LIMIT 10;
   ```

### Solutions

**Option 1: Add missing category label patterns**
- Update `categorize()` function in `subscription-chittorgarh.ts` to recognize the actual label text
- Example: Add `/^overall$/i` if the page uses "Overall" instead of "Total"

**Option 2: Manual data entry via admin panel**
- Admin can manually enter retail/NII/QIB values in the IPO form
- These override/supplement scraper data in the UI

**Option 3: Fall back to NSE/BSE API**
- If Chittorgarh page is unreliable, ensure `nse_symbol` or `bse_scrip_code` is set
- Scraper will try NSE API or BSE page as fallback sources

## Verifying the Fix

After changes, run the scraper manually:
```bash
curl -X POST http://localhost:3000/api/cron/scrape-subscription \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Check that `subscription_live` now has retail/nii/qib entries for the affected IPO.

## Related Code

- **Scraper**: `/lib/scraper/sources/subscription-chittorgarh.ts`
- **Category mapping**: `categorize()` function (line 104)
- **Table detection**: `isSubscriptionTable()` function (line 154)
- **Live subscription component**: `/components/ipo-detail/live-subscription-tracker.tsx`
- **Allotment chance component**: `/components/ipo-detail/allotment-chance.tsx`

