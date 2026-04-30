# SME IPO Data Mapping - Supabase to CSV Flow

## Data Snapshot - What We Have

### Current Location
- **SME CSV File**: `data/listed-sme-ipos/2026/2026.csv`
- **Supabase Table**: `ipos` table (current/upcoming IPOs)
- **Migration Endpoint**: `/api/admin/migrate-to-listed` (handles SME/Mainboard split)

---

## Data Structure Comparison

### Supabase `ipos` Table (Source Data)
```
id, company_name, name, slug, abbr, exchange, sector, 
list_date, listing_date, price_min, price_max, lot_size,
issue_size, issue_size_cr, fresh_issue, ofs,
gmp, gmp_percent, est_list_price,
subscription_total, subscription_retail, subscription_nii, subscription_qib,
ai_prediction, ai_confidence, sentiment_score, sentiment_label,
status, registrar, lead_manager, market_cap, pe_ratio,
listing_price, current_price, listing_gain_percent,
nse_symbol, bse_scrip_code, logo_url,
roe, roce, debt_equity, eps, book_value, face_value
```

### SME CSV File (Destination)
```
IPO Name, Listing Date, Sector, Retail Quota (%), Issue Price Upper, 
Listing Price, Closing Price NSE, Listing Gain (%), 
Listing gains on closing Basis (%), Day Change After Listing (%),
QIB Day3 Subscription, HNI/NII Day3 Subscription, Retail Day3 Subscription,
Day1 Subscription, Day2 Subscription, Day3 Subscription,
GMP percentage D1-D5, Peer PE, Debt/Equity, IPO PE, Latest EBIDTA,
PE vs Sector Ratio, Nifty 3D/1W/1M Return (%), Nifty During IPO Window (%),
Market Sentiment Score, Issue Size (Cr), Fresh Issue, OFS,
GMP Day-1-5 (pricing indicators)
```

---

## Field Mapping for Auto-Migration

When an IPO is marked as "listed" with a `listing_price`:

| CSV Column | Supabase Field | Logic | Example |
|-----------|----------------|-------|---------|
| IPO Name | `name` | Direct copy | "Safety Controls" |
| Listing Date | `listing_date` | Format as "DD-Mmm-YY" | "13-Apr-26" |
| Sector | `sector` | Direct copy | "Power & Energy (EPC)" |
| Retail Quota (%) | From `ipo_issue_details.retail_quota_percent` | Direct (or default 35%) | 35 |
| Issue Price Upper | `price_max` | Direct | 80 |
| Listing Price | `listing_price` | Admin input | 83.0 |
| Closing Price NSE | `current_price` | Scraper or manual update | 78.99 |
| Listing Gain (%) | Calculate `(listing_price - price_max) / price_max * 100` | Auto-calc | 3.75% |
| Listing gains on closing Basis (%) | Calculate `(closing_price - price_max) / price_max * 100` | Auto-calc | -1.26% |
| Day Change After Listing (%) | Calculate from price movement | Day 1 data | -4.83% |
| QIB Day3 Subscription | Latest from `subscription_qib` | Latest day value | 1.31x |
| HNI/NII Day3 Subscription | Latest from `subscription_nii` | Latest day value | 2.8x |
| Retail Day3 Subscription | Latest from `subscription_retail` | Latest day value | 0.76x |
| Day1-3 Subscription | From `subscription_history` table | Multiple records per IPO | 0.33x, 0.9x, 1.35x |
| GMP percentage D1-D5 | From `gmp_history` table | Filter by date window | 0, NA, NA, NA, NA |
| Market Sentiment Score | `sentiment_score` | Direct (0-100) | 0.05 |
| Issue Size (Cr) | `issue_size_cr` | Direct | 48.0 |
| Fresh Issue | `fresh_issue` | Direct | 48.0 |
| OFS | `ofs` | Direct | - |
| PE Ratios & Financial Metrics | From `ipo_financials` or direct | Join with financials | Various |

---

## Current Flow Status

### ✅ What Works
1. **Admin marks IPO as listed** - Sets `status = 'listing'` and `listing_price` in Supabase
2. **Migration endpoint triggered** - `/api/admin/migrate-to-listed` is called
3. **CSV file updated** - IPO data is appended to SME.csv or Mainboard.csv based on exchange
4. **Database updated** - IPO `status` is set to 'listed'

### ⚠️ What Needs Implementation
1. **Auto-fetch latest subscription data** - Pull latest values from `subscription_history` at migration time
2. **Auto-fetch GMP history** - Get last 5 days of GMP data from `gmp_history`
3. **Calculate derived fields**:
   - Listing Gain % = (listing_price - issue_price_upper) / issue_price_upper * 100
   - Closing Gain % = (closing_price - issue_price_upper) / issue_price_upper * 100
   - Day Change % = (closing_price - listing_price) / listing_price * 100
   - PE vs Sector Ratio = IPO PE / Peer PE
4. **Scrape closing price** - Need live NSE price after listing (requires scraper)
5. **Dashboard auto-refresh** - Trigger cache invalidation for both SME and Mainboard dashboards

---

## Example Data from CSV (Safety Controls - Listed 13-Apr-26)

```csv
IPO Name: Safety Controls
Listing Date: 13-Apr-26
Sector: Power & Energy (EPC)
Retail Quota: 35%
Issue Price Upper: Rs 80
Listing Price: Rs 83.0
Closing Price NSE: Rs 78.99
Listing Gain: +3.75%
Closing Basis Gain: -1.26%
Day Change: -4.83%
QIB Day3: 1.31x
HNI/NII Day3: 2.8x
Retail Day3: 0.76x
Subscriptions: Day1=0.33x, Day2=0.9x, Day3=1.35x
GMP Days: 0, NA, NA, NA, NA
Market Sentiment: 0.05
Issue Size: Rs 48 Cr
Fresh Issue: Rs 48 Cr
```

---

## Supabase Query for Safety Controls

```sql
-- Get IPO core data
SELECT * FROM ipos WHERE slug = 'safety-controls';

-- Get latest subscriptions
SELECT * FROM subscription_history WHERE ipo_id = ? 
ORDER BY date DESC, time DESC LIMIT 3;

-- Get GMP history (last 5 days)
SELECT * FROM gmp_history WHERE ipo_id = ? 
ORDER BY date DESC LIMIT 5;

-- Get financials
SELECT * FROM ipo_financials WHERE ipo_id = ?;

-- Get issue details  
SELECT * FROM ipo_issue_details WHERE ipo_id = ?;
```

---

## Next Steps for Implementation

1. Update `/api/admin/migrate-to-listed/route.ts` to:
   - Fetch latest subscription data from `subscription_history`
   - Fetch GMP history from `gmp_history`
   - Calculate derived metrics
   - Format all values to match CSV structure

2. Create data fetcher utility:
   - Function to get latest subscription values
   - Function to calculate listing gain percentages
   - Function to format dates as "DD-Mmm-YY"

3. Update dashboard loaders:
   - Both `/admin/dashboard` and public `/` should refresh after migration
   - Clear cached listed IPO data

4. Add post-listing flow:
   - Scrape closing price from NSE after listing
   - Update CSV file with closing price and gains
   - Trigger daily GMP and price updates for 5 days post-listing
