# IPOGyani Database Schema

> **Database:** Supabase (PostgreSQL)
> **Last Updated:** 2026-04-18
> **Canonical source:** `scripts/007_complete_setup.sql` + migrations 008–015
> **Correction:** Earlier versions of this doc claimed IDs were UUID.
> **They are not.** `ipos.id`, `listed_ipos.id`, `ipo_financials.id`, etc.
> are `SERIAL` (`INTEGER`). Most foreign keys are `INTEGER REFERENCES ipos(id)`.
> The only UUID tables are `admins`, `expert_reviews`, `reviews`, and the
> automation tables (`ipo_news`, `ipo_youtube_summaries`, `ipo_predictions`,
> `ml_model_registry`).

---

## 1. Migration Order

Run in `scripts/` in numerical order. 007 is a consolidated "fresh start"
that includes the content of 001–006; later migrations are strictly
additive.

| #    | File                                     | What it does                                                                 |
|------|------------------------------------------|------------------------------------------------------------------------------|
| 001  | `001_create_ipo_tables.sql`              | Legacy initial schema (superseded by 007)                                    |
| 002  | `002_add_logo_url.sql`                   | `ipos.logo_url`                                                              |
| 002  | `002_add_exchange_symbols.sql`           | `ipos.nse_symbol`, `ipos.bse_scrip_code`                                     |
| 002  | `002_add_scrape_fields.sql`              | Scraper URL columns + `allotment_results` table                              |
| 003  | `003_add_chittorgarh_url.sql`            | `ipos.chittorgarh_url`                                                       |
| 003  | `003_add_financials_columns.sql`         | `pat`, `ebitda`, ratios, `net_worth` on `ipo_financials`                     |
| 004  | `004_add_scraper_tables.sql`             | Initial scraper support tables                                               |
| 004  | `004_automation_extensions.sql`          | `ipo_news`, `ipo_youtube_summaries`, `ipo_predictions`, `scraper_health`, `ml_model_registry` + 13 new columns on `ipos` |
| 004b | `004b_ipos_missing_columns.sql`          | `pe_ratio`, `issue_size_cr`, `listing_price`, `listing_gain_percent`         |
| 004c | `004c_align_admin_rls.sql`               | Fix admin RLS to match custom JWT auth (service-role-only)                   |
| 005  | `005_add_bulk_data_features.sql`         | `peer_companies`, `time_slot` on `gmp_history`, financial extras             |
| 006  | `006_create_admin_table.sql`             | `admins` table with bcrypt password_hash                                     |
| 007  | `007_complete_setup.sql`                 | **Consolidated fresh-start**. Safe to run on an empty DB.                    |
| 008  | `008_add_kpi_table.sql`                  | `ipo_kpi` (dated + pre_post KPI entries)                                     |
| 009  | `009_add_issue_details_support.sql`      | Ensures `ipo_issue_details` + trigger + RLS                                  |
| 010  | `010_fix_financials_and_subscriptions.sql` | Unique constraints, sNII/bNII/employee on `subscription_history`, etc.     |
| 011  | `011_subscription_live_tables.sql`       | `subscription_live` (current category-wise) + rebuild `subscription_history` |
| 012  | `012_add_gmp_source_urls.sql`            | `ipowatch_gmp_url`, `ipocentral_gmp_url`                                     |
| 013  | `013_subscription_source_tracking.sql`   | `ipos.subscription_source`                                                   |
| 014  | `014_add_allotment_url.sql`              | `ipos.allotment_url`                                                         |
| 015  | `015_add_listing_day_fields.sql`         | `ipos.list_day_close`, `ipos.list_day_change_pct`                            |

> Two different files share the "002" and "003" prefix. They are
> independent additive migrations — order among them doesn't matter
> because they each target different columns. Keep the prefixes when
> adding new migrations; they are for humans, not Postgres.

---

## 2. Tables

### 2.1 `ipos` — main IPO table

PK: `id SERIAL`.

**Identity / meta**
| Column         | Type          | Notes                                              |
|----------------|---------------|----------------------------------------------------|
| id             | SERIAL PK     | Integer (auto-increment)                           |
| company_name   | TEXT NOT NULL | Primary display name                               |
| name           | TEXT          | Legacy alias                                        |
| slug           | TEXT UNIQUE NOT NULL | URL slug                                    |
| abbr           | TEXT          | Legacy — NOT WRITTEN by app code anymore. Keep column; generate abbreviation on the fly in code. |
| status         | TEXT DEFAULT 'upcoming' | One of: open / lastday / allot / listing / upcoming / closed / listed |
| exchange       | TEXT DEFAULT 'Mainboard' | BSE SME / NSE SME / Mainboard / REIT       |
| sector         | TEXT          |                                                    |
| logo_url       | TEXT          | Vercel Blob public URL                             |
| bg_color       | TEXT DEFAULT '#f0f9ff' | Card background                           |
| fg_color       | TEXT DEFAULT '#0369a1' | Card foreground                           |
| created_at     | TIMESTAMPTZ DEFAULT NOW() |                                         |
| updated_at     | TIMESTAMPTZ DEFAULT NOW() | Trigger-managed                        |

**Pricing / structure**
| Column         | Type                    | Notes                        |
|----------------|-------------------------|------------------------------|
| price_min      | NUMERIC(12,2) DEFAULT 0 |                              |
| price_max      | NUMERIC(12,2) DEFAULT 0 |                              |
| lot_size       | INTEGER DEFAULT 0       |                              |
| issue_size     | TEXT                    | Display (e.g. "31.75 Cr")    |
| issue_size_cr  | NUMERIC(12,2)           | Numeric, added in 004b       |
| fresh_issue    | TEXT                    | Display                      |
| fresh_issue_cr | NUMERIC(12,2)           | Numeric (004_automation)     |
| ofs            | TEXT                    | Display                      |
| ofs_cr         | NUMERIC(12,2)           | Numeric (004_automation)     |
| est_list_price | NUMERIC(12,2)           |                              |
| face_value     | NUMERIC(10,2)           | 005                          |
| eps            | NUMERIC(10,2)           |                              |
| book_value     | NUMERIC(10,2)           |                              |
| roe / roce / debt_equity | NUMERIC(6,2)  |                              |
| pe_ratio       | NUMERIC(10,2)           | 004b                         |
| market_cap     | TEXT                    |                              |
| sector_pe      | NUMERIC(10,2)           | 004_automation               |

**Dates**
| Column          | Type | Notes |
|-----------------|------|-------|
| open_date       | DATE |       |
| close_date      | DATE |       |
| allotment_date  | DATE |       |
| list_date       | DATE | Legacy |
| listing_date    | DATE | Canonical — used by new code |

**GMP**
| Column                | Type                     | Notes                   |
|-----------------------|--------------------------|-------------------------|
| gmp                   | NUMERIC(10,2) DEFAULT 0  | Current GMP             |
| gmp_percent           | NUMERIC(6,2) DEFAULT 0   |                         |
| gmp_last_updated      | TIMESTAMPTZ              |                         |
| gmp_sources_used      | TEXT[]                   | Voting sources (004)    |
| last_gmp_update       | TIMESTAMPTZ              |                         |
| chittorgarh_url       | TEXT                     |                         |
| investorgain_gmp_url  | TEXT                     |                         |
| ipowatch_gmp_url      | TEXT                     | 012                     |
| ipocentral_gmp_url    | TEXT                     | 012                     |

**Subscription**
| Column                    | Type                    | Notes                          |
|---------------------------|-------------------------|--------------------------------|
| subscription_retail       | TEXT DEFAULT '-'        |                                |
| subscription_nii          | TEXT DEFAULT '-'        |                                |
| subscription_qib          | TEXT DEFAULT '-'        |                                |
| subscription_shni         | NUMERIC(10,2) DEFAULT 0 |                                |
| subscription_bhni         | NUMERIC(10,2) DEFAULT 0 |                                |
| subscription_employee     | NUMERIC(10,2) DEFAULT 0 |                                |
| subscription_total        | NUMERIC(10,2) DEFAULT 0 |                                |
| subscription_day          | INTEGER DEFAULT 0       |                                |
| subscription_is_final     | BOOLEAN DEFAULT FALSE   |                                |
| subscription_last_scraped | TIMESTAMPTZ             | 004_automation                 |
| subscription_last_updated | TIMESTAMPTZ             | 011                            |
| subscription_source       | TEXT                    | 013 — nse / bse / chittorgarh  |
| last_subscription_update  | TIMESTAMPTZ             |                                |
| investorgain_sub_url      | TEXT                    |                                |
| nse_symbol                | TEXT                    |                                |
| bse_scrip_code            | TEXT                    |                                |

**AI / sentiment / predictions**
| Column                       | Type                     | Notes           |
|------------------------------|--------------------------|-----------------|
| ai_prediction                | NUMERIC(6,2) DEFAULT 0   |                 |
| ai_confidence                | INTEGER DEFAULT 50       |                 |
| sentiment_score              | INTEGER DEFAULT 50       |                 |
| sentiment_label              | TEXT DEFAULT 'Neutral'   |                 |
| prediction_last_generated    | TIMESTAMPTZ              | 004_automation  |

**Listing day (migration 015)**
| Column              | Type          | Notes                                          |
|---------------------|---------------|------------------------------------------------|
| listing_price       | NUMERIC(12,2) | Opening price on listing day                   |
| listing_gain_percent| NUMERIC(8,2)  | ML target variable                             |
| current_price       | NUMERIC(10,2) |                                                |
| list_day_close      | NUMERIC(10,2) | Closing price on listing day                   |
| list_day_change_pct | NUMERIC(6,2)  | % change between listing_price and list_day_close |

**People / other**
| Column                 | Type   | Notes                                 |
|------------------------|--------|---------------------------------------|
| registrar              | TEXT   |                                        |
| brlm                   | TEXT   | Book Running Lead Manager (TS: `leadManager`) |
| lead_manager           | TEXT   | Legacy alias                           |
| description            | TEXT   | TS: `aboutCompany`                     |
| about_company          | TEXT   | Legacy alias                           |
| allotment_url          | TEXT   | 014 — direct registrar URL             |
| anchor_investors       | JSONB  | 004_automation                         |
| promoter_holding_pre   | NUMERIC(5,2) | 004_automation                   |
| promoter_holding_post  | NUMERIC(5,2) | 004_automation                   |
| news_last_fetched      | TIMESTAMPTZ  | 004_automation                   |
| youtube_last_fetched   | TIMESTAMPTZ  | 004_automation                   |
| last_scraped_at        | TIMESTAMPTZ  |                                   |

### 2.2 `ipo_financials`

PK: `id SERIAL`. FK: `ipo_id INTEGER REFERENCES ipos(id) ON DELETE CASCADE`.

| Column       | Type          | Notes                   |
|--------------|---------------|-------------------------|
| fiscal_year  | TEXT          | e.g. 'FY23', 'FY24'     |
| revenue      | NUMERIC(15,2) |                         |
| profit       | NUMERIC(15,2) | Legacy (copied to `pat`) |
| pat          | NUMERIC(15,2) |                         |
| ebitda       | NUMERIC(15,2) |                         |
| net_worth    | NUMERIC(15,2) |                         |
| assets, liabilities | NUMERIC(15,2) |                  |
| revenue_fy23/24/25, pat_fy23/24/25, ebitda_fy23/24/25 | NUMERIC(12,2) | Legacy wide-format columns |
| roe / roce / debt_equity | NUMERIC(6,2) |                |
| eps, book_value | NUMERIC(10,2) |                     |
| created_at   | TIMESTAMPTZ DEFAULT NOW() |             |

Unique: `(ipo_id, fiscal_year)` — for upsert.

### 2.3 `ipo_issue_details`

PK: `id SERIAL`. Unique: `(ipo_id)` (one row per IPO).

| Column                      | Type          |
|-----------------------------|---------------|
| total_issue_size_cr         | NUMERIC(10,2) |
| fresh_issue_cr              | NUMERIC(10,2) |
| fresh_issue_percent         | NUMERIC(6,2)  |
| ofs_cr                      | NUMERIC(10,2) |
| ofs_percent                 | NUMERIC(6,2)  |
| retail_quota_percent        | NUMERIC(6,2)  |
| nii_quota_percent           | NUMERIC(6,2)  |
| qib_quota_percent           | NUMERIC(6,2)  |
| employee_quota_percent      | NUMERIC(6,2)  |
| shareholder_quota_percent   | NUMERIC(6,2)  |
| ipo_objectives              | TEXT[]        |
| created_at / updated_at     | TIMESTAMPTZ   |

### 2.4 `ipo_kpi` (migration 008)

PK: `id SERIAL`. FK: `ipo_id INTEGER REFERENCES ipos(id)`.

| Column     | Type        | Notes                                                                 |
|------------|-------------|-----------------------------------------------------------------------|
| kpi_type   | VARCHAR(20) | CHECK IN ('dated', 'pre_post')                                         |
| metric     | VARCHAR(50) | roe, roce, debt_equity, ronw, pat_margin, ebitda_margin, price_to_book, eps, pe, promoter_holding, market_cap, promoters, disclaimer |
| date_label | VARCHAR(50) | "Dec 31, 2025" / "pre" / "post" / NULL                                 |
| value      | DECIMAL(15,2) | Numeric value                                                       |
| text_value | TEXT        | For text fields (promoters, disclaimer)                                |
| created_at / updated_at | TIMESTAMPTZ |                                                           |

### 2.5 `gmp_history`

PK: `id SERIAL`. FK: `ipo_id INTEGER REFERENCES ipos(id) ON DELETE CASCADE`.

| Column     | Type          | Notes                                              |
|------------|---------------|----------------------------------------------------|
| date       | DATE NOT NULL |                                                    |
| gmp        | NUMERIC(10,2) NOT NULL |                                            |
| gmp_percent| NUMERIC(6,2)  |                                                    |
| time_slot  | TEXT DEFAULT 'morning' | CHECK IN ('morning', 'evening') (005)    |
| source     | TEXT          | e.g. 'investorgain'                                 |
| recorded_at| TIMESTAMPTZ DEFAULT NOW() |                                        |
| kostak     | NUMERIC(10,2) | 004_automation                                     |
| subject_to_sauda | NUMERIC(10,2) | 004_automation                               |
| created_at | TIMESTAMPTZ DEFAULT NOW() |                                        |

Unique index: `(ipo_id, date, time_slot)`.

### 2.6 `subscription_history`

PK: `id SERIAL`. FK: `ipo_id INTEGER REFERENCES ipos(id) ON DELETE CASCADE`.
Unique: `(ipo_id, date, time)`.

| Column       | Type          | Notes                                 |
|--------------|---------------|---------------------------------------|
| date         | DATE NOT NULL |                                       |
| time         | TEXT DEFAULT '17:00' |                                |
| day_number   | INT DEFAULT 1 |                                       |
| anchor       | NUMERIC DEFAULT 0 |                                   |
| retail / nii / snii / bnii / qib / employee / total | NUMERIC | Subscription times |
| is_final     | BOOLEAN DEFAULT FALSE | 010                           |
| source       | TEXT DEFAULT 'manual' | 010                           |
| qib_x / nii_big_x / nii_small_x / retail_x / employee_x / shareholder_x / total_x | NUMERIC(10,2) | Per-category x-times (004_automation) |
| total_applications | BIGINT   | 004_automation                        |
| scraped_at   | TIMESTAMPTZ   | 004_automation                        |
| created_at / updated_at | TIMESTAMPTZ |                             |

### 2.7 `subscription_live` (migration 011)

PK: `id SERIAL`. Unique: `(ipo_id, category)`.

| Column             | Type          | Notes                                               |
|--------------------|---------------|-----------------------------------------------------|
| category           | TEXT NOT NULL | CHECK IN ('anchor','qib','nii','bnii','snii','retail','employee','total') |
| subscription_times | NUMERIC(10,2) | e.g. 1.52                                           |
| shares_offered     | BIGINT        |                                                     |
| shares_bid_for     | BIGINT        |                                                     |
| total_amount_cr    | NUMERIC(12,2) |                                                     |
| display_order      | INT           | For UI ordering                                     |
| updated_at / created_at | TIMESTAMPTZ |                                                 |

### 2.8 `peer_companies`

PK in 005 is `UUID`, in 007's re-create is `SERIAL`. In the shipped DB
the 007 consolidation wins — treat `id` as `SERIAL`.

| Column         | Type          | Notes                         |
|----------------|---------------|-------------------------------|
| ipo_id         | INTEGER FK    |                               |
| company_name   | TEXT NOT NULL |                               |
| name           | TEXT          | Legacy alias                  |
| market_cap     | NUMERIC(15,2) |                               |
| revenue        | NUMERIC(15,2) |                               |
| pat            | NUMERIC(15,2) |                               |
| pe_ratio / pb_ratio | NUMERIC(10,2) |                          |
| roe / roce / debt_equity | NUMERIC(6,2) |                     |
| eps            | NUMERIC(10,2) |                               |
| current_price  | NUMERIC(10,2) |                               |
| is_ipo_company | BOOLEAN DEFAULT FALSE | Marks the IPO's own row|
| display_order  | INTEGER DEFAULT 0 |                           |
| created_at / updated_at | TIMESTAMPTZ |                     |

### 2.9 `listed_ipos` — archive of listed IPOs

PK: `id SERIAL`. Unique: `(slug)`.

| Column                | Type          | Notes                                              |
|-----------------------|---------------|----------------------------------------------------|
| original_ipo_id       | INTEGER       | FK to `ipos(id) ON DELETE SET NULL`                |
| company_name          | TEXT NOT NULL |                                                    |
| name                  | TEXT          | Legacy alias                                       |
| slug                  | TEXT UNIQUE   |                                                    |
| abbr                  | TEXT          | Legacy                                             |
| bg_color, fg_color    | TEXT          |                                                    |
| exchange              | TEXT DEFAULT 'Mainboard' |                                         |
| sector                | TEXT          |                                                    |
| list_date             | DATE          |                                                    |
| year                  | TEXT          | Denormalized for fast `WHERE year = ...` queries   |
| issue_price           | NUMERIC(12,2) |                                                    |
| list_price            | NUMERIC(12,2) |                                                    |
| listing_price         | NUMERIC(10,2) | Duplicate of list_price for compat                 |
| current_price         | NUMERIC(10,2) |                                                    |
| gain_pct              | NUMERIC(8,2)  | Listing-day gain %                                 |
| listing_gain_percent  | NUMERIC(5,2)  | Duplicate of gain_pct                              |
| sub_times             | NUMERIC(10,2) | Final total subscription ×                         |
| gmp_peak              | TEXT          |                                                    |
| ai_pred, ai_err       | TEXT / NUMERIC(6,2) |                                              |
| nse_symbol, bse_scrip_code | TEXT     |                                                    |
| logo_url              | TEXT          |                                                    |
| created_at / updated_at | TIMESTAMPTZ |                                                    |

> The `listed_ipos` table is the DB half of the listed-IPO archive. The
> CSV half lives in `data/listed-ipos/<year>.csv` with ~40 enrichment
> columns. Pages merge them via `lib/listed-ipos/loader.ts`.

### 2.10 `expert_reviews`

PK: `id UUID DEFAULT uuid_generate_v4()`. FK: `ipo_id INTEGER`.

| Column        | Type                            |
|---------------|---------------------------------|
| source        | TEXT NOT NULL                   |
| source_type   | TEXT                             (youtube / analyst / news / firm) |
| author        | TEXT                            |
| summary       | TEXT NOT NULL                   |
| sentiment     | TEXT DEFAULT 'neutral'          (positive / neutral / negative) |
| recommendation| TEXT                            (subscribe / avoid / neutral) |
| rating        | INTEGER                         |
| url           | TEXT                            |
| logo_url      | TEXT                            |
| review_date   | DATE                            |
| created_at    | TIMESTAMPTZ DEFAULT NOW()       |

### 2.11 `reviews` (legacy alias)

PK: `id UUID`. FK: `ipo_id INTEGER`. Superseded by `expert_reviews` —
kept because some older admin flows still write here.

### 2.12 `admins` (migration 006)

PK: `id UUID DEFAULT gen_random_uuid()`.

| Column              | Type                     |
|---------------------|--------------------------|
| username            | TEXT NOT NULL UNIQUE     |
| password_hash       | TEXT NOT NULL            (bcryptjs, salt rounds 10) |
| must_reset_password | BOOLEAN DEFAULT TRUE     |
| created_at / updated_at | TIMESTAMPTZ DEFAULT NOW() |

Default seed: `admin` / `changeme123` (must_reset_password = true).

### 2.13 Automation tables (migration 004_automation_extensions)

All PKs are `UUID DEFAULT gen_random_uuid()`. FKs to `ipos(id)` are
`INTEGER NOT NULL`.

**`ipo_news`**

| Column        | Type                                                         |
|---------------|--------------------------------------------------------------|
| ipo_id        | INTEGER FK                                                   |
| title         | TEXT NOT NULL                                                |
| url           | TEXT UNIQUE NOT NULL                                         |
| source        | TEXT                                                          |
| image_url     | TEXT                                                          |
| published_at  | TIMESTAMPTZ                                                   |
| summary       | TEXT                                                          |
| sentiment     | TEXT CHECK IN ('positive','neutral','negative')               |
| created_at    | TIMESTAMPTZ DEFAULT NOW()                                     |

Index: `(ipo_id, published_at DESC)`.

**`ipo_youtube_summaries`**

| Column           | Type                                                     |
|------------------|----------------------------------------------------------|
| ipo_id           | INTEGER FK                                               |
| video_id         | TEXT UNIQUE NOT NULL                                     |
| video_url, channel_name, thumbnail_url | TEXT                               |
| view_count       | BIGINT                                                    |
| published_at     | TIMESTAMPTZ                                               |
| ai_summary       | TEXT                                                      |
| key_points       | TEXT[]                                                    |
| sentiment        | TEXT CHECK IN ('positive','neutral','negative')           |
| created_at       | TIMESTAMPTZ DEFAULT NOW()                                 |

**`ipo_predictions`**

| Column                  | Type                                                 |
|-------------------------|------------------------------------------------------|
| ipo_id                  | INTEGER FK                                           |
| model_version           | TEXT NOT NULL                                        |
| predicted_listing_price | NUMERIC(12,2)                                         |
| predicted_gain_percent  | NUMERIC(8,2)                                          |
| confidence_lower / upper| NUMERIC(8,2)                                          |
| confidence_label        | TEXT CHECK IN ('low','medium','high')                 |
| reasoning               | TEXT                                                  |
| features_used           | JSONB                                                 |
| generated_at            | TIMESTAMPTZ DEFAULT NOW()                             |

**`scraper_health`**

PK: `id BIGSERIAL`.

| Column          | Type                                                       |
|-----------------|------------------------------------------------------------|
| scraper_name    | TEXT NOT NULL                                              |
| status          | TEXT NOT NULL CHECK IN ('success','failed','skipped')       |
| items_processed | INT NOT NULL DEFAULT 0                                     |
| error_message   | TEXT                                                       |
| duration_ms     | INT                                                        |
| ran_at          | TIMESTAMPTZ NOT NULL DEFAULT NOW()                         |

Index: `(scraper_name, ran_at DESC)`.

**`ml_model_registry`**

| Column              | Type                                                   |
|---------------------|--------------------------------------------------------|
| version             | TEXT UNIQUE NOT NULL                                    |
| blob_url            | TEXT                                                    (Vercel Blob URL) |
| feature_schema_url  | TEXT                                                    |
| metrics             | JSONB                                                   |
| is_active           | BOOLEAN NOT NULL DEFAULT FALSE                          |
| trained_at          | TIMESTAMPTZ NOT NULL DEFAULT NOW()                      |

Partial unique index: `(is_active) WHERE is_active = TRUE` — only one
active model row at a time.

### 2.14 `allotment_results` (migration 002_add_scrape_fields)

PK: `id SERIAL`. FK: `ipo_id INTEGER`.
Unique: `(ipo_id, category)`.

| Column                | Type | Notes                                        |
|-----------------------|------|----------------------------------------------|
| category              | TEXT | 'retail' / 'nii' / 'qib' / 'employee' / 'shareholder' |
| applications_received | INTEGER |                                            |
| lots_available        | INTEGER |                                            |
| allotment_ratio       | TEXT | e.g. "1:5"                                    |
| cutoff_lots           | INTEGER | Min lots required for allotment            |
| created_at            | TIMESTAMPTZ DEFAULT NOW() |                         |

---

## 3. Row Level Security (RLS)

**Auth model recap (important):** This app does not use Supabase Auth.
All admin-side DB writes go through the service-role key, which
bypasses RLS. RLS policies therefore only matter for `anon` and
`authenticated` roles (the public site's Supabase client).

### Policies on public-read tables

```sql
-- Applied to: ipos, ipo_financials, ipo_issue_details, gmp_history,
--             subscription_history, subscription_live, expert_reviews,
--             peer_companies, listed_ipos, reviews, ipo_kpi, allotment_results,
--             ipo_news, ipo_youtube_summaries, ipo_predictions
CREATE POLICY "Public read access" ON <table>
  FOR SELECT USING (true);

-- Plus service-role bypass (belt-and-braces):
CREATE POLICY "Service role full access" ON <table>
  FOR ALL USING (true) WITH CHECK (true);
```

### Admin-only tables

`admins`, `scraper_health`, and `ml_model_registry` have RLS enabled with
no SELECT policy for `anon` / `authenticated` — so they're effectively
service-role-only. Migration `004c_align_admin_rls.sql` also adds
explicit deny-by-default policies for clarity.

If you need a new admin-only table, do the same:

```sql
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
-- no SELECT policy → zero rows for anon/authenticated
CREATE POLICY "Deny anon my_table"
  ON my_table FOR SELECT
  TO anon, authenticated
  USING (FALSE);
```

---

## 4. Enums and Check Constraints

Defined in `007_complete_setup.sql`. Wrapped in `DO $$ ... EXCEPTION WHEN duplicate_object THEN null END $$` so they're safe to re-run.

| Enum              | Values                                                          |
|-------------------|-----------------------------------------------------------------|
| ipo_status        | open, lastday, allot, listing, upcoming, closed                 |
| exchange_type     | BSE SME, NSE SME, Mainboard, REIT                               |
| sentiment_label   | Bullish, Neutral, Bearish                                       |
| review_source_type| youtube, analyst, news, firm                                    |
| review_sentiment  | positive, neutral, negative                                     |

> In practice, `ipos.status` / `ipos.exchange` / `ipos.sentiment_label`
> are declared as `TEXT` (not the enum). The enums are reserved for
> future tightening; application code validates against string literal
> unions in `lib/data.ts`. Add `listed` to the `ipo_status` literal union
> if you add it to the enum — the code currently lists it as a status.

---

## 5. Triggers

A shared `update_updated_at_column()` function keeps `updated_at` fresh.
It's attached to: `ipos`, `listed_ipos`, `peer_companies`, `admins`,
`ipo_issue_details`, `ipo_kpi`.

---

## 6. Column Name Mapping (TypeScript → Database)

| TypeScript property   | Database column         |
|-----------------------|-------------------------|
| `name`                | `company_name`          |
| `listDate`            | `listing_date` (preferred) or `list_date` (legacy) |
| `leadManager`         | `brlm`                  |
| `aboutCompany`        | `description`           |
| `gmpPercent`          | `gmp_percent` or computed |
| `issueSize`           | `issue_size` (display)  |
| `issueSizeCr`         | `issue_size_cr` (numeric) |
| `freshIssueCr`        | `fresh_issue_cr`        |
| `ofsCr`               | `ofs_cr`                |
| `listingPrice`        | `listing_price`         |
| `listingGainPercent`  | `listing_gain_percent`  |
| `listDayClose`        | `list_day_close`        |
| `listDayChangePct`    | `list_day_change_pct`   |
| `allotmentUrl`        | `allotment_url`         |
| `subscriptionSource`  | `subscription_source`   |
| `subscription.retail` | `subscription_retail`   |
| `subscription.nii`    | `subscription_nii`      |
| `subscription.qib`    | `subscription_qib`      |
| `subscription.total`  | `subscription_total`    |
| `subscription.day`    | `subscription_day`      |
| `subscription.isFinal`| `subscription_is_final` |
| `subscriptionLive`    | table `subscription_live`|
| `subscriptionHistory` | table `subscription_history`|
| `kpi`                 | table `ipo_kpi`         |
| `issueDetails`        | table `ipo_issue_details`|
| `financials`          | table `ipo_financials`  |
| `peerCompanies`       | table `peer_companies`  |
| `expertReviews`       | table `expert_reviews`  |
| `gmpHistory`          | table `gmp_history`     |
| `anchorInvestors`     | `anchor_investors` (JSONB) |
| `promoterHoldingPre`  | `promoter_holding_pre`  |
| `promoterHoldingPost` | `promoter_holding_post` |
| `sectorPe`            | `sector_pe`             |

---

## 7. Common Queries

### List current IPOs (public)
```sql
SELECT *
FROM ipos
WHERE status IN ('open', 'upcoming', 'closed', 'lastday', 'allot', 'listing')
ORDER BY open_date ASC;
```

### Get IPO by slug with GMP history
```sql
SELECT i.*,
  (SELECT json_agg(
     json_build_object('gmp', g.gmp, 'date', g.date, 'time_slot', g.time_slot)
     ORDER BY g.date DESC, g.time_slot DESC
   )
   FROM gmp_history g WHERE g.ipo_id = i.id) AS gmp_history
FROM ipos i
WHERE i.slug = $1;
```

### Add a GMP snapshot (daily)
```sql
INSERT INTO gmp_history (ipo_id, date, gmp, gmp_percent, time_slot, source)
VALUES ($1, CURRENT_DATE, $2, $3, 'evening', 'investorgain')
ON CONFLICT (ipo_id, date, time_slot) DO UPDATE
  SET gmp = EXCLUDED.gmp,
      gmp_percent = EXCLUDED.gmp_percent,
      source = EXCLUDED.source,
      recorded_at = NOW();

UPDATE ipos
SET gmp = $2, gmp_percent = $3, gmp_last_updated = NOW()
WHERE id = $1;
```

### Upsert subscription_live
```sql
INSERT INTO subscription_live
  (ipo_id, category, subscription_times, shares_offered, shares_bid_for, total_amount_cr, display_order)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (ipo_id, category) DO UPDATE
  SET subscription_times = EXCLUDED.subscription_times,
      shares_offered     = EXCLUDED.shares_offered,
      shares_bid_for     = EXCLUDED.shares_bid_for,
      total_amount_cr    = EXCLUDED.total_amount_cr,
      display_order      = EXCLUDED.display_order,
      updated_at         = NOW();
```

### Listed-IPO archive: fetch a year (DB side only)
```sql
SELECT id, company_name, name, slug, sector, exchange, list_date,
       issue_price, list_price, listing_price, current_price,
       gain_pct, listing_gain_percent, sub_times, year
FROM listed_ipos
WHERE year = $1::TEXT
   OR (list_date >= ($1 || '-01-01')::DATE
   AND list_date <= ($1 || '-12-31')::DATE);
```

---

## 8. Troubleshooting

### `PGRST204` — "Could not find the 'X' column of 'ipos' in the schema cache"

The Supabase API cache is stale after a schema change. Run either:

```sql
NOTIFY pgrst, 'reload schema';
```

...in the SQL editor, or click **Project Settings → API → Reload schema**.

Still failing? **Project Settings → General → Restart project**. Also
verify the column really exists:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ipos'
ORDER BY ordinal_position;
```

### "relation does not exist" on a new table

Your migrations may not have been run in order. Confirm with:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Then run the missing migration from `scripts/` in Supabase SQL editor.

### Logo upload returns 400

The upload route is `/api/admin/upload-logo` and uses Vercel Blob. Check:

1. `BLOB_READ_WRITE_TOKEN` is set (auto-provisioned when the Vercel Blob
   integration is added).
2. File size ≤ 2 MB.
3. Request carries a valid JWT in `Authorization: Bearer ...`.

### Migration `ipos.id` is UUID somewhere / INTEGER somewhere else

The source of truth is `007_complete_setup.sql` which uses `SERIAL`.
The earlier `001_create_ipo_tables.sql` used UUID and is superseded —
do not run both on the same database. For a fresh DB, run 007 first,
then all migrations from 008 onward.

---

## 9. Fresh-Start Checklist

For a brand-new Supabase project:

1. Create the project in Supabase.
2. In SQL Editor, run `scripts/007_complete_setup.sql`.
3. Run 008 → 015 in order.
4. Run `NOTIFY pgrst, 'reload schema';`.
5. Set environment variables (see `AI_CODEBASE_GUIDE.md` §9).
6. Log in to `/admin/login` with `admin` / `changeme123` and reset the
   password immediately.

---

## 10. Changelog

| Date       | Change                                                                                      |
|------------|---------------------------------------------------------------------------------------------|
| 2026-04-18 | Full rewrite. Corrected ID types to SERIAL, added all tables from migrations 006–015, clarified RLS model, added per-column migration mapping. |
| 2026-04-10 | Previous version (claimed UUID IDs, missing automation + KPI + live subscription tables).   |
