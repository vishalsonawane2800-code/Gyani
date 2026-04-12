# IPOGyani Database Schema Reference

> **Database:** Supabase (PostgreSQL)
> **Last Updated:** 2026-04-10
> **Version:** 2.1 (abbr column removed)

---

## CRITICAL FIX REQUIRED - 2026-04-10

**Issue:** "Could not find the 'abbr' column of 'ipos' in the schema cache" error

**Root Cause:** 
- Old migration `001_create_ipo_tables.sql` defined `abbr` column
- New schema doesn't have `abbr` (removed in v2)
- Database schema cache is out of sync

**Solution - DO THIS NOW:**

1. Go to Supabase Dashboard > Project Settings > API > Click **"Reload schema"**
2. OR run in SQL Editor: `NOTIFY pgrst, 'reload schema';`
3. If still failing, restart project from Project Settings > General

**Changes Made (2026-04-10):**
- ✅ Removed `abbr` field from IPO admin form (components/admin/ipo-form.tsx)
- ✅ Removed `generateAbbr()` function 
- ✅ Abbreviation now generated on-the-fly from company name in logo preview
- ✅ API routes (POST/PUT) never sent `abbr` - already correct
- ✅ Logo upload API working correctly with Vercel Blob

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

**Unique Constraint:** `(ipo_id, fiscal_year)` - ensures one entry per fiscal year per IPO

### Table: `ipo_kpi`
Key Performance Indicators for IPOs.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| ipo_id | UUID | NO | - | Foreign key to ipos |
| kpi_type | TEXT | NO | - | 'dated' or 'pre_post' |
| metric | TEXT | NO | - | Metric name (ROE, ROCE, EPS, PE, etc.) |
| date_label | TEXT | YES | - | Date label for dated metrics |
| value | NUMERIC | YES | - | Numeric value |
| text_value | TEXT | YES | - | Text value for non-numeric data |
| created_at | TIMESTAMPTZ | YES | NOW() | Created timestamp |
| updated_at | TIMESTAMPTZ | YES | NOW() | Last update time |

### Table: `ipo_issue_details`
Detailed issue information for IPOs.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| ipo_id | UUID | NO | - | Foreign key to ipos (UNIQUE) |
| total_issue_size_cr | NUMERIC | YES | - | Total issue size in Crores |
| fresh_issue_cr | NUMERIC | YES | - | Fresh issue amount in Crores |
| fresh_issue_percent | NUMERIC | YES | - | Fresh issue percentage |
| ofs_cr | NUMERIC | YES | - | OFS amount in Crores |
| ofs_percent | NUMERIC | YES | - | OFS percentage |
| retail_quota_percent | NUMERIC | YES | - | Retail quota percentage |
| nii_quota_percent | NUMERIC | YES | - | NII quota percentage |
| qib_quota_percent | NUMERIC | YES | - | QIB quota percentage |
| employee_quota_percent | NUMERIC | YES | - | Employee quota percentage |
| shareholder_quota_percent | NUMERIC | YES | - | Shareholder quota percentage |
| ipo_objectives | TEXT[] | YES | - | Array of IPO objectives |
| created_at | TIMESTAMPTZ | YES | NOW() | Created timestamp |
| updated_at | TIMESTAMPTZ | YES | NOW() | Last update time |

### Table: `subscription_history`
Historical subscription data for IPOs.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| ipo_id | UUID | NO | - | Foreign key to ipos |
| date | DATE | NO | - | Subscription date |
| time | TEXT | YES | '17:00' | Time of snapshot |
| day_number | INT | YES | 1 | Day 1, 2, or 3 |
| retail | NUMERIC | YES | 0 | Retail subscription times |
| nii | NUMERIC | YES | 0 | NII subscription times |
| snii | NUMERIC | YES | 0 | sNII subscription times |
| bnii | NUMERIC | YES | 0 | bNII subscription times |
| qib | NUMERIC | YES | 0 | QIB subscription times |
| total | NUMERIC | YES | 0 | Total subscription times |
| employee | NUMERIC | YES | 0 | Employee subscription times |
| is_final | BOOLEAN | YES | FALSE | Whether this is final data |
| source | TEXT | YES | 'manual' | Data source |
| created_at | TIMESTAMPTZ | YES | NOW() | Created timestamp |

**Unique Constraint:** `(ipo_id, date, time)` - ensures one entry per time snapshot per IPO

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
- `000_fresh_start.sql` - **USE THIS** - Complete fresh schema with all tables (UUID-based) - DOES NOT INCLUDE abbr
- `schema.sql` - Old basic schema (deprecated)
- `001_create_ipo_tables.sql` - Old full schema (deprecated - has `abbr` column, causes schema cache errors)

**NOTE:** If you used `001_create_ipo_tables.sql` before, you MUST refresh the Supabase schema cache after removing the old migration.

---

## Troubleshooting

### Error: "Could not find the 'abbr' column of 'ipos' in the schema cache"

**Steps to fix:**
1. **Reload Supabase Schema Cache** (REQUIRED):
   - Go to: Supabase Dashboard → Project Settings → API → "Reload schema" button
   - OR run in SQL Editor: `NOTIFY pgrst, 'reload schema';`
   
2. **Verify Database State**:
   - In Supabase SQL Editor, run: `SELECT column_name FROM information_schema.columns WHERE table_name='ipos' AND column_name='abbr';`
   - If it returns nothing, the `abbr` column is already removed ✓
   - If it returns a row, you need to run a migration to drop it

3. **If column still exists in database**:
   ```sql
   -- Run this in Supabase SQL Editor
   ALTER TABLE ipos DROP COLUMN IF EXISTS abbr;
   NOTIFY pgrst, 'reload schema';
   ```

4. **Verify the fix**:
   - Try creating a new IPO in admin dashboard
   - Logo should upload successfully now

### Logo Upload Not Working

**Likely cause:** IPO creation is failing due to the `abbr` column error above

**Fix:** Reload Supabase schema cache (see steps above), then retry

**Upload details:**
- Uses Vercel Blob storage (public access)
- Max file size: 2MB
- Accepted formats: PNG, JPG, GIF, WebP, etc.
- Files stored in: `ipos` bucket under `logos/` folder

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
