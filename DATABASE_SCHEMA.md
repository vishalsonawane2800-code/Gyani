# IPOGyani Database Schema Reference

> **Database:** Supabase (PostgreSQL)
> **Last Updated:** 2026-04-10

---

## Quick Start SQL

### Create Basic Tables
Run this in Supabase SQL Editor to set up the essential tables:

```sql
-- Simple IPO Database Schema
-- Run this in your Supabase SQL Editor

-- 1. IPOs table
CREATE TABLE IF NOT EXISTS ipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming',
  price_band TEXT NOT NULL,
  lot_size INT NOT NULL,
  issue_size TEXT NOT NULL,
  exchange TEXT NOT NULL,
  open_date DATE NOT NULL,
  close_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. GMP History table
CREATE TABLE IF NOT EXISTS gmp_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
  gmp INT NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ipos_slug ON ipos(slug);
CREATE INDEX IF NOT EXISTS idx_ipos_status ON ipos(status);
CREATE INDEX IF NOT EXISTS idx_gmp_history_ipo_id ON gmp_history(ipo_id);
CREATE INDEX IF NOT EXISTS idx_gmp_history_recorded_at ON gmp_history(recorded_at DESC);

-- Enable RLS
ALTER TABLE ipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmp_history ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read ipos" ON ipos FOR SELECT USING (true);
CREATE POLICY "Public read gmp_history" ON gmp_history FOR SELECT USING (true);
```

### Sample Seed Data
```sql
-- Sample seed data for your Supabase
-- Run this after schema.sql

INSERT INTO ipos (name, slug, status, price_band, lot_size, issue_size, exchange, open_date, close_date) VALUES
('Emiac Technologies', 'emiac-technologies-ipo', 'open', '93-98', 1200, '31.75 Cr', 'BSE SME', '2026-03-27', '2026-04-08'),
('Highness Microelectronics', 'highness-microelectronics-ipo', 'upcoming', '114-120', 1200, '21.67 Cr', 'BSE SME', '2026-03-31', '2026-04-03'),
('Powerica Limited', 'powerica-limited-ipo', 'open', '375-395', 37, '1100 Cr', 'Mainboard', '2026-03-24', '2026-03-27'),
('Fractal Analytics', 'fractal-analytics-ipo', 'upcoming', '540-565', 26, '2400 Cr', 'Mainboard', '2026-04-14', '2026-04-17');

-- Add GMP history
INSERT INTO gmp_history (ipo_id, gmp, recorded_at)
SELECT id, 5, NOW() - INTERVAL '2 days' FROM ipos WHERE slug = 'emiac-technologies-ipo'
UNION ALL
SELECT id, 8, NOW() - INTERVAL '1 day' FROM ipos WHERE slug = 'emiac-technologies-ipo'
UNION ALL
SELECT id, 10, NOW() FROM ipos WHERE slug = 'emiac-technologies-ipo'
UNION ALL
SELECT id, 15, NOW() FROM ipos WHERE slug = 'highness-microelectronics-ipo'
UNION ALL
SELECT id, 12, NOW() FROM ipos WHERE slug = 'powerica-limited-ipo'
UNION ALL
SELECT id, 35, NOW() FROM ipos WHERE slug = 'fractal-analytics-ipo';
```

---

## Full Schema (All Tables)

### Table: `ipos`
Main IPO data storage.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| name | TEXT | NO | - | Full IPO name |
| slug | TEXT | NO | - | URL-friendly identifier (UNIQUE) |
| abbr | TEXT | YES | - | Short abbreviation |
| status | TEXT | NO | 'upcoming' | IPO status |
| price_band | TEXT | NO | - | Display format "93-98" |
| price_min | NUMERIC(12,2) | YES | - | Minimum price |
| price_max | NUMERIC(12,2) | YES | - | Maximum price |
| lot_size | INT | NO | - | Lot size |
| issue_size | TEXT | NO | - | Display "31.75 Cr" |
| issue_size_cr | NUMERIC(10,2) | YES | - | Numeric value |
| fresh_issue | TEXT | YES | - | Fresh issue portion |
| ofs | TEXT | YES | - | OFS portion |
| exchange | TEXT | NO | - | Exchange type |
| sector | TEXT | YES | - | Industry sector |
| open_date | DATE | NO | - | Subscription start |
| close_date | DATE | NO | - | Subscription end |
| allotment_date | DATE | YES | - | Allotment date |
| list_date | DATE | YES | - | Listing date |
| gmp | NUMERIC(10,2) | YES | 0 | Current GMP |
| gmp_percent | NUMERIC(6,2) | YES | 0 | GMP percentage |
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
| lead_manager | TEXT | YES | - | Lead manager |
| market_cap | TEXT | YES | - | Market cap |
| pe_ratio | NUMERIC(8,2) | YES | - | P/E ratio |
| about_company | TEXT | YES | - | Company description |
| chittorgarh_url | TEXT | YES | - | External link |
| nse_symbol | TEXT | YES | - | NSE symbol |
| bse_scrip_code | TEXT | YES | - | BSE scrip code |
| created_at | TIMESTAMPTZ | YES | NOW() | Created timestamp |

### Table: `gmp_history`
Grey Market Premium history tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| ipo_id | UUID | NO | - | Foreign key to ipos |
| gmp | INT | NO | - | GMP value |
| gmp_percent | NUMERIC(6,2) | YES | - | GMP percentage |
| date | DATE | YES | - | Record date |
| source | TEXT | YES | - | Data source |
| recorded_at | TIMESTAMPTZ | YES | NOW() | Timestamp |

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
| `REIT` | Real Estate Investment Trust |

---

## Common Queries

### Get All Current IPOs with Latest GMP
```sql
SELECT 
  i.*,
  (SELECT gmp FROM gmp_history WHERE ipo_id = i.id ORDER BY recorded_at DESC LIMIT 1) as latest_gmp
FROM ipos i
WHERE status IN ('open', 'upcoming', 'closed', 'lastday', 'allot', 'listing')
ORDER BY open_date ASC;
```

### Get IPO by Slug with GMP History
```sql
SELECT 
  i.*,
  json_agg(
    json_build_object('gmp', g.gmp, 'date', g.recorded_at)
    ORDER BY g.recorded_at DESC
  ) as gmp_history
FROM ipos i
LEFT JOIN gmp_history g ON g.ipo_id = i.id
WHERE i.slug = 'emiac-technologies-ipo'
GROUP BY i.id;
```

### Update GMP for IPO
```sql
-- Add new GMP entry
INSERT INTO gmp_history (ipo_id, gmp, gmp_percent, date, source)
SELECT id, 15, 12.5, CURRENT_DATE, 'IPOWatch'
FROM ipos WHERE slug = 'emiac-technologies-ipo';

-- Update main IPO table
UPDATE ipos 
SET gmp = 15, gmp_percent = 12.5, gmp_last_updated = NOW()
WHERE slug = 'emiac-technologies-ipo';
```

---

## Row Level Security Policies

All tables have RLS enabled with public read access:

```sql
-- Allow anyone to read IPO data
CREATE POLICY "Public read ipos" ON ipos FOR SELECT USING (true);
CREATE POLICY "Public read gmp_history" ON gmp_history FOR SELECT USING (true);

-- For admin write access, add service role or authenticated policies
```

---

## Migration Files

Located in `/scripts/`:
1. `schema.sql` - Basic schema (quick setup)
2. `seed.sql` - Sample data
3. `001_create_ipo_tables.sql` - Full schema with all tables
4. `002_add_logo_url.sql` - Logo URL column
5. `002_add_exchange_symbols.sql` - Exchange symbols
6. `003_add_chittorgarh_url.sql` - External URL
