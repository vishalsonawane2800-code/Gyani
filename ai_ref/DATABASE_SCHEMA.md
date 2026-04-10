# IPOGyani Database Schema Reference

> **Database:** Supabase (PostgreSQL)
> **Last Updated:** 2026-04-10

---

## IMPORTANT: Refresh Schema Cache

After creating tables, you MUST refresh Supabase's PostgREST schema cache:

1. Go to Supabase Dashboard > Project Settings > API > Click "Reload schema"
2. OR run: `NOTIFY pgrst, 'reload schema';` in SQL Editor
3. OR restart the project from Project Settings > General

---

## Quick Start - Fresh Database Setup

Run `scripts/000_fresh_start.sql` in Supabase SQL Editor. This creates all tables with correct UUID types.

---

## Current Database Schema (v2 - UUID-based)

### Table: `ipos`
Main IPO data storage.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| **company_name** | TEXT | NO | - | Full IPO name |
| slug | TEXT | NO | - | URL-friendly identifier (UNIQUE) |
| status | TEXT | NO | 'upcoming' | IPO status |
| exchange | TEXT | NO | - | Exchange type |
| sector | TEXT | YES | - | Industry sector |
| price_min | NUMERIC(12,2) | YES | - | Minimum price |
| price_max | NUMERIC(12,2) | YES | - | Maximum price |
| lot_size | INT | NO | - | Lot size |
| issue_size | TEXT | YES | - | Display "31.75 Cr" |
| open_date | DATE | NO | - | Subscription start |
| close_date | DATE | NO | - | Subscription end |
| allotment_date | DATE | YES | - | Allotment date |
| **listing_date** | DATE | YES | - | Listing date |
| gmp | NUMERIC(10,2) | YES | 0 | Current GMP |
| gmp_last_updated | TIMESTAMPTZ | YES | - | GMP update time |
| subscription_total | NUMERIC(10,2) | YES | 0 | Total subscription |
| subscription_retail | TEXT | YES | '-' | Retail subscription |
| subscription_nii | TEXT | YES | '-' | NII subscription |
| subscription_qib | TEXT | YES | '-' | QIB subscription |
| subscription_day | INT | YES | 0 | Subscription day |
| subscription_is_final | BOOLEAN | YES | FALSE | Final subscription |
| ai_prediction | NUMERIC(6,2) | YES | 0 | AI predicted gain |
| ai_confidence | INT | YES | 50 | AI confidence % |
| sentiment_score | INT | YES | 50 | Sentiment score |
| sentiment_label | TEXT | YES | 'Neutral' | Bullish/Neutral/Bearish |
| bg_color | TEXT | YES | '#f0f9ff' | Card background |
| fg_color | TEXT | YES | '#0369a1' | Card foreground |
| logo_url | TEXT | YES | - | Logo image URL |
| registrar | TEXT | YES | - | Registrar name |
| **brlm** | TEXT | YES | - | Book Running Lead Manager |
| **description** | TEXT | YES | - | Company description |
| chittorgarh_url | TEXT | YES | - | Chittorgarh.com URL |
| investorgain_gmp_url | TEXT | YES | - | InvestorGain GMP URL |
| investorgain_sub_url | TEXT | YES | - | InvestorGain Sub URL |
| nse_symbol | TEXT | YES | - | NSE symbol |
| bse_scrip_code | TEXT | YES | - | BSE scrip code |
| created_at | TIMESTAMPTZ | YES | NOW() | Created timestamp |

**IMPORTANT Column Name Mappings (Code → Database):**
- `name` → `company_name`
- `list_date` → `listing_date`
- `lead_manager` → `brlm`
- `about_company` → `description`
- `abbr` - REMOVED (not in database)
- `gmp_percent` - REMOVED (calculated in code)
- `issue_size_cr` - REMOVED (use issue_size)
- `fresh_issue` - REMOVED
- `ofs` - REMOVED

### Table: `gmp_history`
Grey Market Premium history tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| ipo_id | UUID | NO | - | Foreign key to ipos |
| gmp | INT | NO | - | GMP value |
| recorded_at | TIMESTAMPTZ | YES | NOW() | Timestamp |

### Table: `listed_ipos`
Archive of listed IPOs with performance data.

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

### Table: `reviews`
Expert reviews for IPOs.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| ipo_id | UUID | NO | - | Foreign key to ipos |
| source | TEXT | NO | - | Review source |
| rating | TEXT | YES | - | Rating (Subscribe, Avoid, etc.) |
| summary | TEXT | YES | - | Review summary |
| created_at | TIMESTAMPTZ | YES | NOW() | Created timestamp |

### Table: `ipo_financials`
Financial data for IPOs.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| ipo_id | UUID | NO | - | Foreign key to ipos |
| fiscal_year | TEXT | YES | - | Fiscal year |
| revenue | NUMERIC(15,2) | YES | - | Revenue |
| pat | NUMERIC(15,2) | YES | - | Profit After Tax |
| net_worth | NUMERIC(15,2) | YES | - | Net Worth |
| created_at | TIMESTAMPTZ | YES | NOW() | Created timestamp |

---

## Status Values

| Status | Description | Display |
|--------|-------------|---------|
| `upcoming` | IPO announced | "Coming Soon" |
| `open` | Currently open | "Open Now" |
| `lastday` | Last day | "Last Day" |
| `closed` | Closed | "Closed" |
| `allot` | Allotment phase | "Allotment" |
| `listing` | Listing today | "Listing Today" |
| `listed` | Listed (historical) | "Listed" |

---

## Exchange Values

| Value | Description |
|-------|-------------|
| `BSE SME` | BSE SME Platform |
| `NSE SME` | NSE Emerge Platform |
| `Mainboard` | Main exchange |

---

## Migration Files

Located in `/scripts/`:
- `000_fresh_start.sql` - **USE THIS** - Complete fresh schema with all tables (UUID-based)
- `schema.sql` - Old basic schema (deprecated)
- `001_create_ipo_tables.sql` - Old full schema (deprecated - has type mismatches)

---

## Row Level Security Policies

All tables have RLS enabled:

```sql
-- Public read access
CREATE POLICY "Public read" ON ipos FOR SELECT USING (true);
CREATE POLICY "Public read" ON gmp_history FOR SELECT USING (true);

-- Service role has full access (for admin operations)
CREATE POLICY "Service role full access" ON ipos FOR ALL USING (true) WITH CHECK (true);
```

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
WHERE i.slug = 'powerica-limited-ipo';
```

### Add GMP Entry
```sql
INSERT INTO gmp_history (ipo_id, gmp) 
VALUES ('uuid-of-ipo', 50);

UPDATE ipos SET gmp = 50, gmp_last_updated = NOW() 
WHERE id = 'uuid-of-ipo';
```
