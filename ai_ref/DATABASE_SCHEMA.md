# IPOGyani Database Schema Reference

> **Database:** Supabase (PostgreSQL)
> **Last Updated:** 2026-04-15
> **Status:** All tables created and running

---

## Quick Reference

All tables are created and running on Supabase. The migration scripts in `/scripts/` have been executed.

---

## Table: `ipos` (Main IPO Data)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| company_name | TEXT | NO | - | Full IPO name |
| slug | TEXT | NO | - | URL-friendly identifier (UNIQUE) |
| status | TEXT | NO | 'upcoming' | IPO status |
| exchange | TEXT | NO | - | 'BSE SME', 'NSE SME', 'Mainboard' |
| sector | TEXT | YES | - | Industry sector |
| price_min | NUMERIC(12,2) | YES | - | Minimum price |
| price_max | NUMERIC(12,2) | YES | - | Maximum price |
| lot_size | INT | NO | - | Lot size |
| issue_size | TEXT | YES | - | Display format "31.75 Cr" |
| open_date | DATE | NO | - | Subscription start |
| close_date | DATE | NO | - | Subscription end |
| allotment_date | DATE | YES | - | Allotment date |
| listing_date | DATE | YES | - | Listing date |
| gmp | NUMERIC(10,2) | YES | 0 | Current GMP |
| gmp_last_updated | TIMESTAMPTZ | YES | - | GMP update time |
| subscription_total | NUMERIC(10,2) | YES | 0 | Total subscription |
| subscription_retail | TEXT | YES | '-' | Retail subscription |
| subscription_nii | TEXT | YES | '-' | NII subscription |
| subscription_qib | TEXT | YES | '-' | QIB subscription |
| subscription_day | INT | YES | 0 | Subscription day |
| subscription_is_final | BOOLEAN | YES | FALSE | Final subscription flag |
| ai_prediction | NUMERIC(6,2) | YES | 0 | AI predicted gain % |
| ai_confidence | INT | YES | 50 | AI confidence % |
| sentiment_score | INT | YES | 50 | Sentiment score (0-100) |
| sentiment_label | TEXT | YES | 'Neutral' | Bullish/Neutral/Bearish |
| bg_color | TEXT | YES | '#f0f9ff' | Card background color |
| fg_color | TEXT | YES | '#0369a1' | Card foreground color |
| logo_url | TEXT | YES | - | Logo image URL |
| registrar | TEXT | YES | - | Registrar name |
| brlm | TEXT | YES | - | Book Running Lead Manager |
| description | TEXT | YES | - | Company description |
| chittorgarh_url | TEXT | YES | - | Chittorgarh.com URL |
| investorgain_gmp_url | TEXT | YES | - | InvestorGain GMP URL |
| investorgain_sub_url | TEXT | YES | - | InvestorGain Sub URL |
| nse_symbol | TEXT | YES | - | NSE symbol |
| bse_scrip_code | TEXT | YES | - | BSE scrip code |
| listing_price | NUMERIC(10,2) | YES | - | Listing price (for listed IPOs) |
| current_price | NUMERIC(10,2) | YES | - | Current market price |
| listing_gain_percent | NUMERIC(6,2) | YES | - | Listing gain % |
| created_at | TIMESTAMPTZ | YES | NOW() | Created timestamp |
| updated_at | TIMESTAMPTZ | YES | NOW() | Updated timestamp |

**Important Column Mappings:**
- `company_name` (DB) = `name` (TypeScript)
- `listing_date` (DB) = `listDate` (TypeScript)
- `brlm` (DB) = `leadManager` (TypeScript)
- `description` (DB) = `aboutCompany` (TypeScript)
- `abbr` column does NOT exist - generated on-the-fly

---

## Table: `subscription_live` (Live Subscription by Category)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| ipo_id | UUID | NO | - | Foreign key to ipos |
| category | TEXT | NO | - | 'anchor', 'qib', 'nii', 'bnii', 'snii', 'retail', 'employee', 'total' |
| subscription_times | NUMERIC(10,2) | YES | 0 | Subscription times (e.g., 1.52x) |
| shares_offered | BIGINT | YES | 0 | Total shares offered |
| shares_bid_for | BIGINT | YES | 0 | Shares bid for |
| total_amount_cr | NUMERIC(12,2) | YES | 0 | Total amount in Crores |
| display_order | INT | YES | 0 | Display order |
| updated_at | TIMESTAMPTZ | YES | NOW() | Last update time |
| created_at | TIMESTAMPTZ | YES | NOW() | Created timestamp |

**Unique Constraint:** `(ipo_id, category)`

---

## Table: `subscription_history` (Day-wise History)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| ipo_id | UUID | NO | - | Foreign key to ipos |
| date | DATE | NO | - | Subscription date |
| time | TEXT | YES | '17:00' | Time of snapshot |
| day_number | INT | YES | 1 | Day 1, 2, or 3 |
| anchor | NUMERIC | YES | 0 | Anchor subscription times |
| retail | NUMERIC | YES | 0 | Retail subscription times |
| nii | NUMERIC | YES | 0 | NII subscription times |
| snii | NUMERIC | YES | 0 | sNII subscription times |
| bnii | NUMERIC | YES | 0 | bNII subscription times |
| qib | NUMERIC | YES | 0 | QIB subscription times |
| total | NUMERIC | YES | 0 | Total subscription times |
| employee | NUMERIC | YES | 0 | Employee subscription times |
| updated_at | TIMESTAMPTZ | YES | NOW() | Last update time |
| created_at | TIMESTAMPTZ | YES | NOW() | Created timestamp |

**Unique Constraint:** `(ipo_id, date, time)`

---

## Table: `gmp_history` (Grey Market Premium History)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| ipo_id | UUID | NO | - | Foreign key to ipos |
| gmp | INT | NO | - | GMP value |
| source | TEXT | YES | - | Data source |
| recorded_at | TIMESTAMPTZ | YES | NOW() | Timestamp |

---

## Table: `ipo_financials` (Financial Data)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| ipo_id | UUID | NO | - | Foreign key to ipos |
| fiscal_year | TEXT | YES | - | 'FY23', 'FY24', 'FY25' |
| revenue | NUMERIC(15,2) | YES | - | Revenue in Cr |
| pat | NUMERIC(15,2) | YES | - | Profit After Tax in Cr |
| ebitda | NUMERIC(15,2) | YES | - | EBITDA in Cr |
| net_worth | NUMERIC(15,2) | YES | - | Net Worth in Cr |
| roe | NUMERIC(6,2) | YES | - | Return on Equity % |
| roce | NUMERIC(6,2) | YES | - | Return on Capital Employed % |
| debt_equity | NUMERIC(6,2) | YES | - | Debt to Equity ratio |
| created_at | TIMESTAMPTZ | YES | NOW() | Created timestamp |

**Unique Constraint:** `(ipo_id, fiscal_year)`

---

## Table: `ipo_kpi` (Key Performance Indicators)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| ipo_id | UUID | NO | - | Foreign key to ipos |
| kpi_type | TEXT | NO | - | 'dated' or 'pre_post' |
| metric | TEXT | NO | - | Metric name (roe, roce, eps, pe, etc.) |
| date_label | TEXT | YES | - | Date label or 'pre'/'post' |
| value | NUMERIC | YES | - | Numeric value |
| text_value | TEXT | YES | - | Text value for non-numeric data |
| created_at | TIMESTAMPTZ | YES | NOW() | Created timestamp |
| updated_at | TIMESTAMPTZ | YES | NOW() | Last update time |

**KPI Types:**
- `dated`: ROE, ROCE, Debt/Equity with specific date labels
- `pre_post`: EPS, P/E, Promoter Holding with pre/post IPO values

---

## Table: `ipo_issue_details` (Issue Structure)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| ipo_id | UUID | NO | - | Foreign key to ipos (UNIQUE) |
| total_issue_size_cr | NUMERIC | YES | - | Total issue size in Cr |
| fresh_issue_cr | NUMERIC | YES | - | Fresh issue amount in Cr |
| fresh_issue_percent | NUMERIC | YES | - | Fresh issue percentage |
| ofs_cr | NUMERIC | YES | - | OFS amount in Cr |
| ofs_percent | NUMERIC | YES | - | OFS percentage |
| retail_quota_percent | NUMERIC | YES | - | Retail quota % |
| nii_quota_percent | NUMERIC | YES | - | NII quota % |
| qib_quota_percent | NUMERIC | YES | - | QIB quota % |
| employee_quota_percent | NUMERIC | YES | - | Employee quota % |
| shareholder_quota_percent | NUMERIC | YES | - | Shareholder quota % |
| ipo_objectives | TEXT[] | YES | - | Array of IPO objectives |
| created_at | TIMESTAMPTZ | YES | NOW() | Created timestamp |
| updated_at | TIMESTAMPTZ | YES | NOW() | Last update time |

---

## Table: `expert_reviews` (Expert/Analyst Reviews)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| ipo_id | UUID | NO | - | Foreign key to ipos |
| source | TEXT | NO | - | Review source (e.g., "Moneycontrol") |
| source_type | TEXT | YES | - | 'youtube', 'analyst', 'news', 'firm' |
| author | TEXT | YES | - | Author name |
| summary | TEXT | YES | - | Review summary |
| sentiment | TEXT | YES | - | 'positive', 'neutral', 'negative' |
| rating | TEXT | YES | - | Rating text |
| url | TEXT | YES | - | Source URL |
| logo_url | TEXT | YES | - | Source logo URL |
| review_date | DATE | YES | - | Review date |
| created_at | TIMESTAMPTZ | YES | NOW() | Created timestamp |

---

## Table: `peer_companies` (Peer Comparison)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| ipo_id | UUID | NO | - | Foreign key to ipos |
| company_name | TEXT | NO | - | Peer company name |
| market_cap | NUMERIC | YES | - | Market cap in Cr |
| revenue | NUMERIC | YES | - | Revenue in Cr |
| pat | NUMERIC | YES | - | PAT in Cr |
| pe_ratio | NUMERIC | YES | - | P/E ratio |
| pb_ratio | NUMERIC | YES | - | P/B ratio |
| roe | NUMERIC | YES | - | ROE % |
| created_at | TIMESTAMPTZ | YES | NOW() | Created timestamp |

---

## Table: `listed_ipos` (Listed IPO Archive)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| company_name | TEXT | NO | - | Company name |
| slug | TEXT | NO | - | URL slug (UNIQUE) |
| exchange | TEXT | YES | - | Exchange type |
| issue_price | NUMERIC(10,2) | YES | - | Issue price |
| listing_price | NUMERIC(10,2) | YES | - | Listing price |
| current_price | NUMERIC(10,2) | YES | - | Current market price |
| listing_gain | NUMERIC(6,2) | YES | - | Listing gain % |
| current_gain | NUMERIC(6,2) | YES | - | Current gain % |
| listing_date | DATE | YES | - | Listing date |
| created_at | TIMESTAMPTZ | YES | NOW() | Created timestamp |

---

## Status Values

| Status | Description |
|--------|-------------|
| `upcoming` | IPO announced, not yet open |
| `open` | Currently accepting subscriptions |
| `lastday` | Last day to subscribe |
| `closed` | Subscription period ended |
| `allot` | Allotment being processed |
| `listing` | Listing today |
| `listed` | Listed on exchange |

---

## Exchange Values

| Value | Description |
|-------|-------------|
| `BSE SME` | BSE SME Platform |
| `NSE SME` | NSE Emerge Platform |
| `Mainboard` | Main exchange |

---

## Common Queries

### Get All Current IPOs
```sql
SELECT * FROM ipos
WHERE status IN ('open', 'upcoming', 'closed', 'lastday', 'allot', 'listing')
ORDER BY open_date ASC;
```

### Get IPO by Slug with GMP History
```sql
SELECT i.*, 
  (SELECT json_agg(json_build_object('gmp', g.gmp, 'recorded_at', g.recorded_at) 
   ORDER BY g.recorded_at DESC) 
   FROM gmp_history g WHERE g.ipo_id = i.id) as gmp_history
FROM ipos i
WHERE i.slug = 'fractal-analytics-ipo';
```

### Add GMP Entry
```sql
INSERT INTO gmp_history (ipo_id, gmp) 
VALUES ('uuid-of-ipo', 50);

UPDATE ipos SET gmp = 50, gmp_last_updated = NOW() 
WHERE id = 'uuid-of-ipo';
```

### Get Listed IPOs
```sql
SELECT * FROM ipos
WHERE status = 'listed'
ORDER BY listing_date DESC
LIMIT 10;
```

---

## Row Level Security (RLS)

All tables have RLS enabled with public read access:

```sql
-- Public read access
CREATE POLICY "Public read" ON ipos FOR SELECT USING (true);

-- Service role has full access
CREATE POLICY "Service role full access" ON ipos FOR ALL USING (true) WITH CHECK (true);
```

---

## Troubleshooting

### Error: "Could not find column in schema cache"

**Solution:** Reload Supabase schema cache
```sql
NOTIFY pgrst, 'reload schema';
```
Or: Supabase Dashboard → Project Settings → API → "Reload schema"

### Error: Duplicate key violation

**Cause:** Unique constraint violated (slug, ipo_id+category, etc.)
**Solution:** Check for existing records before inserting

### Error: Foreign key constraint

**Cause:** Referenced ipo_id doesn't exist
**Solution:** Ensure IPO exists before adding related data
