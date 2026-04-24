# Mehul Telecom Limited - Listed Data Completion Guide

## Current Status
Mehul Telecom has been added to `data/listed-ipos/2026/2026.csv` with the following populated fields:
- **IPO Name**: Mehul Telecom Limited ✓
- **Listing Date**: 2026-04-24 ✓
- **Sector**: Mobile Retail / Telecom Distribution ✓
- **Retail Quota (%)**: 35 ✓
- **Issue Price Upper**: 98 ✓
- **Listing Price**: 108.0 ✓
- **Listing Gain (%)**: 10.2 ✓
- **Day3 Subscription (QIB/HNI/Retail/Total)**: 44.91x ✓

## Fields That Need Population

From your screenshot and the empty fields visible, the following information needs to be added:

### 1. Closing Price NSE & Related Metrics
```
- Closing Price NSE: [need from NSE website/data feed]
- Listing gains on closing Basis (%): [calculated: ((closing - issue_price) / issue_price) * 100]
- Day Change After Listing (%): [need from Day 1-5 price history]
```

### 2. GMP History (All Days Need Values)
```
From screenshot: All GMP fields showed "-" (not available yet)
Columns needed:
- GMP percentage D1, D2, D3, D4, D5
- GMP Day-1 (Rs), GMP Day-2 (Rs), etc.
```

### 3. Financial Metrics
```
- Peer PE: [need sector peer analysis]
- Debt/Equity: [from ipo_financials table]
- IPO PE: [calculated: issue_price / EPS]
- Latest EBITDA (Cr): [from ipo_financials table]
- PE vs Sector Ratio: [calculated: IPO PE / Peer PE]
```

### 4. Issue & Financials Details
```
- Issue Size (₹ Cr): [from ipo_issue_details]
- Fresh Issue: [from ipo_issue_details]
- OFS: [from ipo_issue_details]
```

### 5. Market Context at Listing
```
- Nifty 3D Return (%)
- Nifty 1W Return (%)
- Nifty 1M Return (%)
- Nifty During IPO Window (%)
- Market Sentiment Score
```

### 6. Prediction Fields (NEW)
```
- GMP Prediction: [e.g., "40-50%" based on day-wise GMP trend]
- IPOGyani AI Prediction: [your AI model's forecast %]
- Prediction Accuracy (%): [|(actual_listing_gain - ai_prediction) / ai_prediction| * 100]
```

## Data Sources

### From Your Supabase (Production Instance)
You mentioned scripts are in `/scripts` folder for the production Supabase. Use these to extract:

1. **Financial Data**:
   ```sql
   SELECT * FROM ipo_financials 
   WHERE ipo_id = (SELECT id FROM ipos WHERE slug = 'mehul-telecom-limited-ipo')
   ```

2. **Issue Details**:
   ```sql
   SELECT * FROM ipo_issue_details 
   WHERE ipo_id = (SELECT id FROM ipos WHERE slug = 'mehul-telecom-limited-ipo')
   ```

3. **GMP History** (for D1-D5 values):
   ```sql
   SELECT date, gmp_rs, gmp_percentage FROM gmp_history 
   WHERE ipo_id = (SELECT id FROM ipos WHERE slug = 'mehul-telecom-limited-ipo')
   ORDER BY date ASC
   ```

4. **Subscription History** (for day-wise breakdown):
   ```sql
   SELECT subscription_date, qib, nii, retail FROM subscription_history 
   WHERE ipo_id = (SELECT id FROM ipos WHERE slug = 'mehul-telecom-limited-ipo')
   ORDER BY subscription_date ASC
   ```

### From External Sources
- **NSE Closing Price**: NSE website or your data feed for 2026-04-24
- **Nifty Returns**: Calculate using Nifty level on listing vs. 3D/1W/1M prior
- **Peer PE & Market Sentiment**: Your existing analysis

## CSV Row Template

Once all data is collected, the Mehul row should look like:
```csv
Mehul Telecom Limited,2026-04-24,Mobile Retail / Telecom Distribution,35,98,108.0,[closing],10.2,[closing_gain],[day_change],[qib_d3],[nii_d3],[retail_d3],[sub_d1],[sub_d2],[sub_d3],[gmp_d1%],[gmp_d2%],[gmp_d3%],[gmp_d4%],[gmp_d5%],[peer_pe],[debt_equity],[ipo_pe],[ebitda],[pe_ratio],[nifty_3d],[nifty_1w],[nifty_1m],[nifty_window],[sentiment_score],[issue_size],[fresh_issue],[ofs],[gmp_d1_rs],[gmp_d2_rs],[gmp_d3_rs],[gmp_d4_rs],[gmp_d5_rs],[gmp_pred],[ai_pred],[accuracy]
```

## Alternative Approach: Run Migration Script

If you have access to your production Supabase from the build environment, you can also use the automated migration script:

```bash
npx ts-node scripts/migrate-ipo-to-listed.ts <mehul-ipo-id> 2026-04-24 108
```

This will automatically:
1. Fetch all related data from Supabase tables
2. Calculate all derived metrics
3. Append the complete row to the CSV
4. Update the database status to `listed`

**Note**: You'll need the actual Mehul Telecom IPO ID from your production database.

## Verification

After populating the data, verify by:
1. Visiting: `/listed/2026/mehul-telecom-limited-ipo`
2. Check that all sections now show data instead of "-"
3. Verify GMP history table displays 5 days of data
4. Check prediction comparison section shows both GMP and AI predictions
