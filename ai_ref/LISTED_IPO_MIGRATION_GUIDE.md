# Listed IPO Data Migration System — Implementation Guide

## Overview
When an IPO transitions from "current" to "listed", all subscription, GMP, financial, and market data should automatically populate the CSV file and display on the listed detail page. This system accomplishes that.

## What Was Built

### 1. CSV Structure Updates
- **File:** `data/listed-ipos/_template.csv`
- **Changes:** Added 3 new columns:
  - `GMP Prediction` — market consensus (e.g., "50-60%")
  - `IPOGyani AI Prediction` — your AI model's listing gain forecast (%)
  - `Prediction Accuracy (%)` — how close AI was to actual listing gain

### 2. CSV Parser Enhancement
- **File:** `lib/listed-ipos/_parse.ts`
- **Changes:** Extended `ListedIpoRecord` type to include:
  - `gmpPrediction: string | null`
  - `aiPrediction: number | null`
  - `predictionAccuracy: number | null`
- Parser now reads these fields from CSV for display on listed IPO pages

### 3. Data Migration Script
- **File:** `scripts/migrate-ipo-to-listed.ts`
- **Usage:** 
  ```bash
  npx ts-node scripts/migrate-ipo-to-listed.ts <ipo-id> <listing-date> <listing-price>
  # Example: npx ts-node scripts/migrate-ipo-to-listed.ts 5 2026-04-24 108
  ```
- **What it does:**
  - Fetches IPO data from `ipos` table
  - Retrieves financials from `ipo_financials`
  - Retrieves issue details from `ipo_issue_details`
  - Retrieves GMP history from `gmp_history` (calculates min-max range as prediction)
  - Retrieves final subscription data from `subscription_history`
  - Calculates listing gain % from issue price vs listing price
  - Calculates prediction accuracy (% deviation between AI prediction and actual gain)
  - Appends fully populated row to year-specific CSV file

### 4. Admin API Endpoint
- **File:** `app/api/admin/migrate-to-listed/route.ts`
- **Endpoint:** `POST /api/admin/migrate-to-listed`
- **Input:**
  ```json
  {
    "ipoId": 5,
    "listingDate": "2026-04-24",
    "listingPrice": 108
  }
  ```
- **Auth:** Validates `Authorization: Bearer <ADMIN_JWT_TOKEN>` header
- **Response:**
  ```json
  {
    "success": true,
    "message": "Successfully migrated Mehul Telecom Limited to listed IPOs",
    "data": {
      "name": "Mehul Telecom Limited",
      "listingDate": "2026-04-24",
      "listingPrice": 108,
      "listingGain": "10.20",
      "totalSubscription": "44.91",
      "csvPath": "/data/listed-ipos/2026/2026.csv"
    }
  }
  ```

### 5. Admin UI Button
- **File:** `app/admin/ipos/[id]/detail-client.tsx`
- **Behavior:**
  - Button appears when IPO status is `listing` or `listed`
  - Label: "Migrate to Listed" with checkmark icon
  - Color: Emerald (success state)
  - Opens dialog with fields:
    - Listing Date (date picker, defaults to today)
    - Listing Price (number input, placeholder shows issue price)
  - On submit: Calls API endpoint, shows success/error toast
  - On success: Auto-refreshes page to show updated data

### 6. Prediction Display Section
- **File:** `app/listed/[year]/[slug]/page.tsx`
- **Location:** After GMP history table
- **Components:**
  - **3-stat card:** Shows GMP Prediction, AI Prediction %, and Actual Listing Gain (with color coding)
  - **Accuracy meter:** Displays prediction accuracy % with assessment:
    - `< 10%` → "Highly accurate"
    - `< 30%` → "Reasonably accurate"
    - `≥ 30%` → "Variance observed"
  - **Conditional:** Only renders if prediction data exists in CSV

## Data Flow

```
Listing Date Arrives
    ↓
Admin updates IPO status → `listing`
    ↓
Admin clicks "Migrate to Listed" button
    ↓
Enters listing date & actual listing price
    ↓
System extracts from Supabase:
  - ipo_financials (ROCE, Debt/Equity, EBITDA)
  - ipo_issue_details (retail quota, fresh issue %, OFS %)
  - gmp_history (all day-wise GMP values)
  - subscription_history (final Day 3 subscription by category)
    ↓
System calculates:
  - Listing gain % = (listing_price - issue_price) / issue_price
  - GMP prediction = "min-max%" from historical GMP
  - Prediction accuracy = ((actual_gain - ai_prediction) / abs(ai_prediction)) * 100
    ↓
Appends complete row to /data/listed-ipos/{year}/{year}.csv
    ↓
Listed IPO detail page loads with:
  - All subscription, GMP, financial data from CSV
  - Prediction comparison section
  - Market context fields shown as "-" (user fills manually or via API)
```

## CSV Row Structure After Migration

A fully migrated IPO row contains:

| Field | Source | Value Example |
|-------|--------|---|
| IPO Name | Input | Mehul Telecom Limited |
| Listing Date | Input | 2026-04-24 |
| Sector | ipos.sector | Mobile Retail / Telecom Distribution |
| Retail Quota (%) | ipo_issue_details | 35 |
| Issue Price Upper | ipos.price_max | 98 |
| Listing Price (Rs) | Input | 108 |
| Closing Price NSE | Manual | "-" (to be filled post-market-close) |
| Listing Gain (%) | Calculated | 10.20 |
| QIB Day3 Subscription | subscription_history | 44.91 |
| HNI/NII Day3 Subscription | subscription_history | 44.91 |
| Retail Day3 Subscription | subscription_history | 44.91 |
| GMP Day-1 | gmp_history | 12 (Rs) |
| GMP percentage D1 | gmp_history | 12.24 (%) |
| ... (Day 2-5) | gmp_history | ... |
| Peer PE | ipo_financials.roce | 25.5 |
| Debt/Equity | ipo_financials | 0.45 |
| IPO PE | ipos.pe_ratio | 62.0 |
| Latest EBITDA | ipo_financials.ebitda_fy25 | 156.8 |
| Issue Size (Rs Cr) | ipos.issue_size_cr | 1000.0 |
| Fresh Issue | ipos.fresh_issue | 700.0 |
| OFS | ipos.ofs | 300.0 |
| GMP Prediction | Calculated | "10-15%" |
| IPOGyani AI Prediction | ipos.ai_prediction | 12.5 |
| Prediction Accuracy (%) | Calculated | 22.0 |

**Fields left as "-" (manual or API fill):**
- Closing Price NSE (post-market-close)
- Listing gains on closing Basis (%)
- Day Change After Listing (%)
- Day1/Day2 Subscription (only Day 3 available)
- Nifty market returns (3D, 1W, 1M during window)
- PE vs Sector Ratio
- Market Sentiment Score (if not in Supabase)

## Testing the Feature

### Test Case 1: Manual Migration via Script
```bash
# Prepare test IPO data in Supabase:
# - Insert row in ipos table (id=100)
# - Insert row in ipo_financials (ipo_id=100)
# - Insert row in ipo_issue_details (ipo_id=100)
# - Insert multiple rows in gmp_history (ipo_id=100)
# - Insert row in subscription_history (ipo_id=100)

# Run migration
npx ts-node scripts/migrate-ipo-to-listed.ts 100 2026-04-24 150

# Verify: CSV file exists at /data/listed-ipos/2026/2026.csv with new row
# Check: All fields populated except "-" fields
```

### Test Case 2: Admin UI Migration
1. Go to `/admin/ipos/5` (Mehul Telecom, already migrated)
2. Confirm "Migrate to Listed" button appears
3. Click button → Dialog opens
4. Enter: Listing Date = today, Listing Price = 115
5. Click "Migrate"
6. Verify: Toast shows success message
7. Visit `/listed/2026/mehul-telecom-limited-ipo`
8. Verify: All data populated, prediction section displays

### Test Case 3: Prediction Accuracy Display
1. Add test data to CSV with:
   - Actual listing gain: 20%
   - AI prediction: 18%
   - Prediction accuracy should be: ((20-18)/18)*100 = 11.11%
2. Load listed IPO page
3. Verify: Accuracy shows "11.11%" with "Highly accurate" label

## Customization Points

### Adding More Calculated Fields
If you want to calculate additional fields (e.g., "Revenue Growth %" from financials):

1. Add column to `_template.csv`
2. Add field to `ListedIpoRecord` type in `_parse.ts`
3. Add parsing logic in `rowToRecord()` function
4. Update migration script to calculate and populate the field
5. Update listed detail page JSX to display the field

### Automating Market Context Fields
To auto-fetch Nifty returns on migration date:

1. Add function to fetch Nifty returns from external API (e.g., BSE API, yfinance)
2. Call in migration script/endpoint before appending to CSV
3. Pass calculated values to CSV row builder

### GMP Prediction Enhancement
Currently uses min-max from GMP history. To enhance:

1. Weight recent GMP values more heavily
2. Consider subscription trend momentum
3. Use ML model if available (separate from AI listing prediction)

## Troubleshooting

### "CSV template not found" error
- Ensure `data/listed-ipos/_template.csv` exists with headers
- Verify all new columns are in template

### "IPO not found" error
- Verify IPO ID is correct in database
- Ensure `ipos` table has row with that ID

### Fields showing "-" after migration
- This is expected for fields without Supabase data
- Fill manually via CSV edit or extend migration to calculate them

### Prediction section not showing on listed page
- Check if CSV has `gmpPrediction` or `aiPrediction` values
- Verify values are not null/empty string
- Check browser console for parsing errors

## Files Changed Summary

| File | Change | Lines |
|------|--------|-------|
| `data/listed-ipos/_template.csv` | Added 3 prediction columns | +1 |
| `lib/listed-ipos/_parse.ts` | Added prediction fields to type + parsing logic | +10 |
| `scripts/migrate-ipo-to-listed.ts` | New migration script | +200 |
| `app/api/admin/migrate-to-listed/route.ts` | New API endpoint | +184 |
| `app/admin/ipos/[id]/detail-client.tsx` | Added migration button + dialog + handler | +100 |
| `app/listed/[year]/[slug]/page.tsx` | Added prediction section | +40 |

**Total new/modified code: ~540 lines**

## Next Steps for User

1. **Test the feature** with a recent IPO (use test script or UI button)
2. **Verify CSV population** — check that all expected fields are filled
3. **Review prediction accuracy** — compare AI prediction vs actual listing gain
4. **Add custom fields** (if needed) — follow customization guide above
5. **Consider automation** — for market context fields that can be fetched via API

## Notes

- System respects existing CSV structure — backward compatible with all historical data
- Prediction fields are optional — feature works with null values
- Migration can be run multiple times for same IPO (overwrites row)
- All data extracted from Supabase — no external API calls required (except optional market data)
- Admin must provide listing date and actual listing price — cannot be auto-detected
