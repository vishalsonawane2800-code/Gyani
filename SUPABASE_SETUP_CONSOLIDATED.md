# Supabase Setup & Configuration Guide
## IPOGyani - Consolidated Database Setup Documentation

**Last Updated:** May 1, 2026  
**Status:** Complete & Production-Ready  
**Consolidation:** All scripts from `/scripts/` directory

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Database Structure](#database-structure)
4. [Enums & Types](#enums--types)
5. [Main Tables](#main-tables)
6. [Migrations Order](#migrations-order)
7. [Setup Scripts](#setup-scripts)
8. [Environment Variables](#environment-variables)
9. [Common Operations](#common-operations)
10. [Troubleshooting](#troubleshooting)

---

## Overview

IPOGyani uses **Supabase** as the primary backend:
- PostgreSQL database for structured data
- Row-Level Security (RLS) for multi-tenant safety
- Auth for admin panel
- Storage for logos and documents
- Real-time subscriptions via pg_listen

**Key Files:**
- Migration scripts: `scripts/*.sql` (32 total migrations)
- Setup runners: `scripts/run-migrations.ts`, `scripts/seed-admin.ts`
- Base schema: `scripts/schema.sql` (basic starter)
- Seed data: `scripts/seed.sql` (sample IPOs)

---

## Quick Start

### 1. Environment Setup

Create `.env.local` with Supabase credentials:

```bash
# From your Supabase project dashboard
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Keep secret - backend only
```

### 2. Run All Migrations

```bash
npm run db:migrate  # or ts-node scripts/run-migrations.ts
```

Expected output:
```
✅ EXECUTED: 001_create_ipo_tables.sql
✅ EXECUTED: 002_add_exchange_symbols.sql
...
📊 Migration Summary: ✅ 22 Executed | ⏭️ 0 Skipped | ❌ 0 Failed
```

### 3. Seed Default Admin

```bash
npm run db:seed-admin  # or ts-node scripts/seed-admin.ts
```

Default credentials:
- **Username:** `admin`
- **Password:** `changeme123`
- **Action:** Reset password on first login

### 4. (Optional) Load Sample Data

```bash
# Run in Supabase SQL Editor or via CLI
psql $DATABASE_URL -f scripts/seed.sql
```

---

## Database Structure

### Architecture Overview

```
┌─────────────────────────────────────────┐
│          IPO Data (Core)                │
│  • ipos (current + upcoming)            │
│  • ipo_financials (1:1)                 │
│  • ipo_issue_details (1:1)              │
│  • gmp_history (1:N)                    │
│  • subscription_history (1:N)           │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│   Admin & Content Management            │
│  • admins (authentication)              │
│  • market_news (articles)               │
│  • faqs (documentation)                 │
│  • community_reviews (user content)     │
│  • expected_soon_ipos (future pipeline) │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│   Live Data & Monitoring                │
│  • live_ipos (subscription sync)        │
│  • gmp_sources (tracking)               │
│  • kpi_snapshot (analytics)             │
│  • subscription_sources (tracking)      │
└─────────────────────────────────────────┘
```

### Data Flow

```
External Sources (CSV/API)
    ↓
Scraper Jobs (Node.js)
    ↓
Supabase Tables
    ↓
Application (Next.js)
    ↓
Frontend (Browser)
```

---

## Enums & Types

All enums are PostgreSQL native types defined in migration `001_create_ipo_tables.sql`:

### IPO Status
```sql
CREATE TYPE ipo_status AS ENUM (
  'open',      -- Subscription is active
  'lastday',   -- Final day of subscription
  'allot',     -- Allotment phase
  'listing',   -- Listed but first day
  'upcoming',  -- Not yet open
  'closed'     -- Subscription closed
);
```

### Exchange Type
```sql
CREATE TYPE exchange_type AS ENUM (
  'BSE SME',   -- Bombay SME platform
  'NSE SME',   -- National SME platform
  'Mainboard', -- Mainboard (BSE/NSE)
  'REIT'       -- Real Estate Investment Trust
);
```

### Sentiment
```sql
CREATE TYPE sentiment_label AS ENUM ('Bullish', 'Neutral', 'Bearish');
CREATE TYPE review_sentiment AS ENUM ('positive', 'neutral', 'negative');
```

### Expert Review Source
```sql
CREATE TYPE review_source_type AS ENUM ('youtube', 'analyst', 'news', 'firm');
```

---

## Main Tables

### 1. `ipos` (Core IPO Data)

**Purpose:** Current and upcoming IPOs  
**Relationships:** Parent table for financials, issue details, GMP history, subscriptions  
**Row Count:** ~500-1000 active records  
**Updated By:** Scraper jobs, manual admin entry

```sql
CREATE TABLE ipos (
  id                  SERIAL PRIMARY KEY,
  name                TEXT NOT NULL,
  slug                TEXT UNIQUE NOT NULL,
  abbr                TEXT NOT NULL,           -- 2-letter abbreviation
  exchange            exchange_type NOT NULL,   -- BSE SME, NSE SME, Mainboard, REIT
  sector              TEXT NOT NULL,            -- Technology, Finance, etc.
  
  -- Dates
  open_date           DATE NOT NULL,            -- Subscription opens
  close_date          DATE NOT NULL,            -- Subscription closes
  allotment_date      DATE NOT NULL,            -- Allotment result date
  list_date           DATE,                     -- Listing date (NULL until listed)
  
  -- Pricing
  price_min           NUMERIC(12,2) NOT NULL,   -- Floor price
  price_max           NUMERIC(12,2) NOT NULL,   -- Ceiling price
  lot_size            INTEGER NOT NULL,         -- Shares per lot
  
  -- Issuance
  issue_size          TEXT NOT NULL,            -- Display: "500 Cr" or "5000 L"
  issue_size_cr       NUMERIC(10,2) NOT NULL,   -- Normalized to crore
  fresh_issue         TEXT,                     -- New capital
  ofs                 TEXT,                     -- Offer for Sale
  
  -- GMP & Pricing
  gmp                 NUMERIC(10,2) DEFAULT 0,  -- Grey Market Premium
  gmp_percent         NUMERIC(6,2) DEFAULT 0,   -- As percentage
  gmp_last_updated    TIMESTAMPTZ,              -- Timestamp of last GMP
  est_list_price      NUMERIC(12,2),            -- Estimated listing price
  
  -- Subscription Data
  subscription_total  NUMERIC(10,2) DEFAULT 0,  -- Overall subscription multiple
  subscription_retail TEXT DEFAULT '-',         -- Retail subscription
  subscription_nii    TEXT DEFAULT '-',         -- Non-Institutional
  subscription_qib    TEXT DEFAULT '-',         -- Qualified Institutional
  subscription_day    INTEGER DEFAULT 0,        -- Days into subscription
  subscription_is_final BOOLEAN DEFAULT FALSE,  -- Lock: true if final
  
  -- AI & Sentiment
  ai_prediction       NUMERIC(6,2) DEFAULT 0,   -- Expected listing gain %
  ai_confidence       INTEGER DEFAULT 50,       -- Confidence level 0-100
  sentiment_score     INTEGER DEFAULT 50,       -- Aggregate sentiment
  sentiment_label     sentiment_label DEFAULT 'Neutral',
  
  -- Company Info
  status              ipo_status DEFAULT 'upcoming',
  registrar           TEXT,                     -- Share registrar
  lead_manager        TEXT,                     -- Lead underwriter
  market_cap          TEXT,                     -- Post-listing market cap
  pe_ratio            NUMERIC(8,2) DEFAULT 0,   -- Price-to-Earnings
  about_company       TEXT,                     -- Company description
  
  -- Branding
  bg_color            TEXT DEFAULT '#f0f9ff',   -- Card background
  fg_color            TEXT DEFAULT '#0369a1',   -- Primary color
  
  -- Metadata
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ipos_slug ON ipos(slug);
CREATE INDEX idx_ipos_exchange ON ipos(exchange);
CREATE INDEX idx_ipos_status ON ipos(status);
CREATE INDEX idx_ipos_open_date ON ipos(open_date DESC);
```

**Key Queries:**

```sql
-- All open IPOs
SELECT * FROM ipos WHERE status = 'open' ORDER BY close_date ASC;

-- SME IPOs only
SELECT * FROM ipos WHERE exchange IN ('BSE SME', 'NSE SME');

-- Recently listed
SELECT * FROM ipos WHERE list_date IS NOT NULL ORDER BY list_date DESC LIMIT 10;

-- High subscription
SELECT * FROM ipos WHERE subscription_total > 50;
```

---

### 2. `ipo_financials` (One-to-One with IPO)

**Purpose:** Historical financial data (FY23, FY24, FY25)  
**Updated By:** Manual admin or automation  
**Access:** `/admin/ipos/[slug]/financials`

```sql
CREATE TABLE ipo_financials (
  id              SERIAL PRIMARY KEY,
  ipo_id          INTEGER UNIQUE REFERENCES ipos(id) ON DELETE CASCADE,
  
  -- Revenue (in Crores)
  revenue_fy23    NUMERIC(12,2),
  revenue_fy24    NUMERIC(12,2),
  revenue_fy25    NUMERIC(12,2),
  
  -- Profit After Tax
  pat_fy23        NUMERIC(12,2),
  pat_fy24        NUMERIC(12,2),
  pat_fy25        NUMERIC(12,2),
  
  -- EBITDA
  ebitda_fy23     NUMERIC(12,2),
  ebitda_fy24     NUMERIC(12,2),
  ebitda_fy25     NUMERIC(12,2),
  
  -- Ratios
  roe             NUMERIC(6,2),                -- Return on Equity
  roce            NUMERIC(6,2),                -- Return on Capital Employed
  debt_equity     NUMERIC(6,2),                -- Debt-to-Equity ratio
  
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3. `admins` (Authentication)

**Purpose:** Admin panel login credentials  
**Created By:** Migration `006_create_admin_table.sql`  
**RLS:** Service role only (backend protected)

```sql
CREATE TABLE admins (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username            TEXT NOT NULL UNIQUE,
  password_hash       TEXT NOT NULL,            -- bcrypt hash
  must_reset_password BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Default admin:
-- Username: admin
-- Password: changeme123 (bcrypt hash preset)
-- Action on first login: Must reset password
```

**Password Management:**

```typescript
// Hash a password (Node.js)
import bcrypt from 'bcryptjs';
const hash = await bcrypt.hash('newPassword', 10);

// Verify on login
const match = await bcrypt.compare('inputPassword', storedHash);
```

---

### 4. `gmp_history` (Grey Market Premium Tracking)

**Purpose:** Historical GMP records (one per day per IPO)  
**Updated By:** Daily scraper job  
**Retention:** Full historical archive

```sql
CREATE TABLE gmp_history (
  id              SERIAL PRIMARY KEY,
  ipo_id          INTEGER REFERENCES ipos(id) ON DELETE CASCADE,
  date            DATE NOT NULL,               -- Record date
  gmp             NUMERIC(10,2) NOT NULL,      -- Premium in rupees
  gmp_percent     NUMERIC(6,2) NOT NULL,       -- As percentage of price
  source          TEXT,                        -- Data source
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ipo_id, date)
);

CREATE INDEX idx_gmp_ipo_date ON gmp_history(ipo_id, date DESC);
```

---

### 5. `subscription_history` (Subscription Tracking)

**Purpose:** Track subscription multiples over time  
**Updated By:** Scraper during subscription period  
**Format:** Daily snapshots with retail/NII/QIB breakdown

```sql
CREATE TABLE subscription_history (
  id              SERIAL PRIMARY KEY,
  ipo_id          INTEGER REFERENCES ipos(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  time            TEXT NOT NULL,               -- Format: "09:30 AM", "03:30 PM"
  retail          NUMERIC(10,2) NOT NULL,      -- Retail subscription multiple
  nii             NUMERIC(10,2) NOT NULL,      -- Non-institutional
  qib             NUMERIC(10,2) NOT NULL,      -- Qualified institutional
  total           NUMERIC(10,2) NOT NULL,      -- Overall multiple
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sub_ipo_date ON subscription_history(ipo_id, date DESC);
```

---

### 6. `live_ipos` (Real-time Sync)

**Purpose:** Temporary table synced via `pg_listen` webhook  
**Updated By:** Scraper → webhook → RLS insert  
**Lifecycle:** Auto-cleanup after 30 days  

```sql
CREATE TABLE live_ipos (
  id              SERIAL PRIMARY KEY,
  ipo_id          INTEGER REFERENCES ipos(id) ON DELETE CASCADE,
  last_update     TIMESTAMPTZ NOT NULL,
  data_json       JSONB,                       -- Full IPO snapshot
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ GENERATED ALWAYS AS (created_at + INTERVAL '30 days') STORED
);

-- Auto-cleanup via pg_cron (if enabled)
SELECT cron.schedule('cleanup-expired-live-ipos', '0 2 * * *', $$
  DELETE FROM live_ipos WHERE expires_at < NOW();
$$);
```

---

### 7. `market_news` (Articles & Updates)

**Purpose:** IPO news, analyst updates, market commentary  
**Created By:** Migration `016_create_market_news.sql`  
**Display:** News section on homepage + detail pages

```sql
CREATE TABLE market_news (
  id              SERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  content         TEXT,                        -- Markdown or HTML
  summary         TEXT,                        -- Excerpt
  author          TEXT,                        -- Attribution
  source_url      TEXT,                        -- Original link
  image_url       TEXT,                        -- Featured image
  ipo_id          INTEGER REFERENCES ipos(id) ON DELETE SET NULL,  -- Linked IPO
  tags            TEXT[],                      -- #IPO, #GMP, etc.
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Migrations Order

All migrations must run **sequentially** in this order. The migration runner (`scripts/run-migrations.ts`) enforces this:

| Seq | File | Purpose | Critical |
|-----|------|---------|----------|
| 1 | `001_create_ipo_tables.sql` | Base schema, enums, core tables | ✅ |
| 2 | `002_add_exchange_symbols.sql` | Add symbol column | ⚠️ |
| 2b | `002_add_logo_url.sql` | Add logo_url column | ⚠️ |
| 2c | `002_add_scrape_fields.sql` | Add scraper metadata | ⚠️ |
| 3 | `003_add_chittorgarh_url.sql` | Add source URL tracking | ⚠️ |
| 3b | `003_add_financials_columns.sql` | Financials enhancement | ⚠️ |
| 4 | `004_add_scraper_tables.sql` | Scraper job tracking | ⚠️ |
| 4b | `004_automation_extensions.sql` | Automation helpers | ⚠️ |
| 4c | `004b_ipos_missing_columns.sql` | Fill missing fields | ⚠️ |
| 4d | `004c_align_admin_rls.sql` | Admin RLS policies | ✅ |
| 5 | `005_add_bulk_data_features.sql` | Bulk operations | ⚠️ |
| 6 | `006_create_admin_table.sql` | Admin authentication | ✅ |
| 7 | `007_complete_setup.sql` | Final triggers + RLS | ✅ |
| 8 | `008_add_kpi_table.sql` | Analytics snapshots | ⚠️ |
| 9 | `009_add_issue_details_support.sql` | Issue breakdowns | ⚠️ |
| 10 | `010_fix_financials_and_subscriptions.sql` | Data normalization | ⚠️ |
| 11 | `011_subscription_live_tables.sql` | Live subscription sync | ⚠️ |
| 12 | `012_add_gmp_source_urls.sql` | GMP source tracking | ⚠️ |
| 13 | `013_subscription_source_tracking.sql` | Source metadata | ⚠️ |
| 14 | `014_add_allotment_url.sql` | Allotment links | ⚠️ |
| 15 | `015_add_listing_day_fields.sql` | Listing metrics | ⚠️ |
| 16 | `016_create_market_news.sql` | News table | ⚠️ |
| 17 | `017_reset_admin_credentials.sql` | Admin reset | ⚠️ |
| 19 | `019_create_logo_storage_bucket.sql` | Storage bucket | ⚠️ |
| 20 | `020_add_document_urls.sql` | Document links | ⚠️ |
| 21 | `021_add_faqs_and_long_content.sql` | FAQs + content | ⚠️ |
| 22 | `022_community_reviews.sql` | User reviews | ⚠️ |

**Critical migrations** (✅) handle core functionality and authentication.  
**Optional migrations** (⚠️) add features but can be skipped if not needed.

---

## Setup Scripts

### `run-migrations.ts`

Runs all `.sql` files in sequence. Handles errors gracefully (continues on known errors like "already exists").

**Usage:**
```bash
npm run db:migrate
# or directly:
ts-node scripts/run-migrations.ts
```

**What It Does:**
1. Connects via `createAdminClient()` (uses `SUPABASE_SERVICE_ROLE_KEY`)
2. Reads each `.sql` file in order
3. Splits by semicolon, filters comments
4. Executes via `supabase.rpc('exec_sql', { sql })`
5. Logs results: ✅ executed, ⏭️ skipped, ❌ failed
6. Exits with code 1 if any non-recoverable errors

---

### `seed-admin.ts`

Creates or updates the default admin user with bcrypt-hashed password.

**Usage:**
```bash
npm run db:seed-admin
# or directly:
ts-node scripts/seed-admin.ts
```

**Output:**
```
Seeding admin user...
✓ Admin user seeded successfully

Default Credentials:
  Username: admin
  Password: changeme123
  
⚠️  Make sure to reset this password on first login!
```

**Notes:**
- The password hash in `006_create_admin_table.sql` is pre-set to bcrypt hash of "changeme123"
- Both hashes must stay in sync when rotating passwords
- Force `must_reset_password = true` on first login

---

### `seed.sql`

Sample data for development/testing:

```sql
-- 4 sample IPOs: 2 SME, 2 Mainboard
INSERT INTO ipos (...) VALUES
  ('Emiac Technologies', ..., 'open', 'BSE SME'),
  ('Highness Microelectronics', ..., 'upcoming', 'BSE SME'),
  ('Powerica Limited', ..., 'open', 'Mainboard'),
  ('Fractal Analytics', ..., 'upcoming', 'Mainboard');

-- GMP history for each
INSERT INTO gmp_history (...) VALUES
  (1, 5, NOW() - INTERVAL '2 days'),
  (1, 8, NOW() - INTERVAL '1 day'),
  (1, 10, NOW()), ...
```

---

## Environment Variables

### Supabase Connection

```bash
# Public keys (safe to expose in frontend)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Secret keys (backend only - DO NOT expose)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Scraper & Jobs

```bash
CRON_SECRET=your-secret-for-cron-validation
IPOJI_API_KEY=ipoji-api-token
IPOWATCH_API_KEY=ipowatch-api-token
```

---

## Common Operations

### Query: Get All Open IPOs

```typescript
const { data, error } = await supabase
  .from('ipos')
  .select('*')
  .eq('status', 'open')
  .order('close_date', { ascending: true });
```

### Query: Get Listed IPOs (Last 30 Days)

```typescript
const { data } = await supabase
  .from('ipos')
  .select('*')
  .not('list_date', 'is', null)
  .gte('list_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  .order('list_date', { ascending: false });
```

### Query: GMP History for IPO

```typescript
const { data } = await supabase
  .from('gmp_history')
  .select('*')
  .eq('ipo_id', ipoId)
  .order('date', { ascending: false })
  .limit(30);
```

### Insert New IPO

```typescript
const { data, error } = await supabase
  .from('ipos')
  .insert({
    name: 'Company Name',
    slug: 'company-name-ipo',
    abbr: 'CN',
    exchange: 'Mainboard',
    sector: 'Technology',
    open_date: '2026-05-15',
    close_date: '2026-05-17',
    allotment_date: '2026-05-20',
    list_date: null,
    price_min: 100,
    price_max: 110,
    lot_size: 50,
    issue_size: '500 Cr',
    issue_size_cr: 500,
  });
```

### Update GMP

```typescript
const { error } = await supabase
  .from('ipos')
  .update({
    gmp: 15,
    gmp_percent: 14.29,
    gmp_last_updated: new Date().toISOString(),
  })
  .eq('id', ipoId);

// Also log in history
await supabase
  .from('gmp_history')
  .insert({
    ipo_id: ipoId,
    date: new Date().toISOString().split('T')[0],
    gmp: 15,
    gmp_percent: 14.29,
    source: 'ipoji',
  });
```

---

## Troubleshooting

### Issue: "User not found" on Admin Login

**Cause:** Admin table not seeded or password hash mismatch

**Fix:**
```bash
npm run db:seed-admin
```

---

### Issue: "Column does not exist"

**Cause:** Migration didn't run fully

**Fix:**
```bash
# Check which migrations ran in Supabase SQL Editor:
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

# Re-run migrations:
npm run db:migrate
```

---

### Issue: "permission denied for schema public"

**Cause:** RLS policies blocking query

**Fix:**
```sql
-- Check RLS status
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Verify policies for table:
SELECT * FROM pg_policies WHERE tablename = 'ipos';

-- If missing, re-run:
npm run db:migrate
```

---

### Issue: Scraper Job Failing

**Cause:** Missing API keys or Supabase connection

**Diagnosis:**
```bash
# Check env vars:
echo $SUPABASE_SERVICE_ROLE_KEY | head -c 20

# Test connection in Node:
ts-node
> import { createAdminClient } from '@/lib/supabase/admin'
> const s = createAdminClient()
> await s.from('ipos').select('count').limit(1)
```

---

### Issue: GMP Data Not Updating

**Cause:** Scraper job not running or API rate limited

**Fix:**
```bash
# Run scraper manually:
ts-node scripts/verify-scrapers-e2e.ts

# Check cron logs in Vercel dashboard
# Env Vars > CRON_SECRET set?
```

---

## File Organization

```
scripts/
├── SQL Migrations (ordered 001-022)
│   ├── 001_create_ipo_tables.sql
│   ├── 002_*.sql
│   ├── ...
│   └── 022_community_reviews.sql
│
├── Setup & Seeds
│   ├── run-migrations.ts         (Executes all migrations)
│   ├── seed-admin.ts            (Creates default admin)
│   ├── schema.sql               (Starter schema)
│   └── seed.sql                 (Sample data)
│
├── Utilities & Debugging
│   ├── clear-subscription-cache.js
│   ├── migrate-ipo-to-listed.ts
│   └── diagnose-gmp-scraper.ts
│
└── Tests & Scrapers
    ├── test-*.mjs               (Scraper tests)
    ├── verify-scrapers-e2e.ts  (E2E verification)
    └── debug-gmp-cron.ts       (Debugging)
```

---

## Next Steps

1. **Setup Supabase Project** → Visit supabase.com, create project
2. **Copy Environment Variables** → Paste into `.env.local`
3. **Run Migrations** → `npm run db:migrate`
4. **Seed Admin** → `npm run db:seed-admin`
5. **Test Connection** → Login to admin panel at `/admin`
6. **Load Sample Data** → `psql $DATABASE_URL -f scripts/seed.sql`

---

**Questions?** Refer to `ai_ref/DATABASE_SCHEMA.md` for table details or `ai_ref/AI_CODEBASE_GUIDE.md` for code patterns.
