-- =============================================
-- IPOGyani Complete Database Setup
-- Run this in your Supabase SQL Editor
-- This combines all migrations into one script
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- Step 1: Create ENUM types (if not exists)
-- =============================================
DO $$ BEGIN
    CREATE TYPE ipo_status AS ENUM ('open', 'lastday', 'allot', 'listing', 'upcoming', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE exchange_type AS ENUM ('BSE SME', 'NSE SME', 'Mainboard', 'REIT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sentiment_label AS ENUM ('Bullish', 'Neutral', 'Bearish');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE review_source_type AS ENUM ('youtube', 'analyst', 'news', 'firm');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE review_sentiment AS ENUM ('positive', 'neutral', 'negative');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- Step 2: Create updated_at trigger function
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Step 3: Create main IPOs table
-- =============================================
CREATE TABLE IF NOT EXISTS ipos (
  id SERIAL PRIMARY KEY,
  company_name TEXT NOT NULL,
  name TEXT,
  slug TEXT UNIQUE NOT NULL,
  abbr TEXT,
  bg_color TEXT DEFAULT '#f0f9ff',
  fg_color TEXT DEFAULT '#0369a1',
  exchange TEXT DEFAULT 'Mainboard',
  sector TEXT,
  open_date DATE,
  close_date DATE,
  allotment_date DATE,
  list_date DATE,
  listing_date DATE,
  price_min NUMERIC(12, 2) DEFAULT 0,
  price_max NUMERIC(12, 2) DEFAULT 0,
  lot_size INTEGER DEFAULT 0,
  issue_size TEXT,
  issue_size_cr NUMERIC(10, 2),
  fresh_issue TEXT,
  ofs TEXT,
  gmp NUMERIC(10, 2) DEFAULT 0,
  gmp_percent NUMERIC(6, 2) DEFAULT 0,
  gmp_last_updated TIMESTAMPTZ DEFAULT NOW(),
  est_list_price NUMERIC(12, 2),
  subscription_total NUMERIC(10, 2) DEFAULT 0,
  subscription_retail TEXT DEFAULT '-',
  subscription_nii TEXT DEFAULT '-',
  subscription_qib TEXT DEFAULT '-',
  subscription_shni NUMERIC(10,2) DEFAULT 0,
  subscription_bhni NUMERIC(10,2) DEFAULT 0,
  subscription_employee NUMERIC(10,2) DEFAULT 0,
  subscription_day INTEGER DEFAULT 0,
  subscription_is_final BOOLEAN DEFAULT FALSE,
  ai_prediction NUMERIC(6, 2) DEFAULT 0,
  ai_confidence INTEGER DEFAULT 50,
  sentiment_score INTEGER DEFAULT 50,
  sentiment_label TEXT DEFAULT 'Neutral',
  status TEXT DEFAULT 'upcoming',
  registrar TEXT,
  lead_manager TEXT,
  brlm TEXT,
  market_cap TEXT,
  pe_ratio NUMERIC(8, 2) DEFAULT 0,
  about_company TEXT,
  description TEXT,
  logo_url TEXT,
  
  -- Financial ratios
  eps NUMERIC(10,2),
  book_value NUMERIC(10,2),
  face_value NUMERIC(10,2),
  roe NUMERIC(6,2),
  roce NUMERIC(6,2),
  debt_equity NUMERIC(6,2),
  
  -- Scraper URLs
  chittorgarh_url TEXT,
  investorgain_gmp_url TEXT,
  investorgain_sub_url TEXT,
  
  -- Exchange symbols
  nse_symbol TEXT,
  bse_scrip_code TEXT,
  
  -- Listing info
  listing_price NUMERIC(10,2),
  current_price NUMERIC(10,2),
  listing_gain_percent NUMERIC(5,2),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_gmp_update TIMESTAMPTZ,
  last_subscription_update TIMESTAMPTZ
);

-- =============================================
-- Step 4: Create IPO Financials table
-- =============================================
CREATE TABLE IF NOT EXISTS ipo_financials (
  id SERIAL PRIMARY KEY,
  ipo_id INTEGER REFERENCES ipos(id) ON DELETE CASCADE,
  fiscal_year TEXT,
  revenue NUMERIC(15, 2),
  profit NUMERIC(15, 2),
  pat NUMERIC(15, 2),
  ebitda NUMERIC(15, 2),
  assets NUMERIC(15, 2),
  liabilities NUMERIC(15, 2),
  revenue_fy23 NUMERIC(12, 2),
  revenue_fy24 NUMERIC(12, 2),
  revenue_fy25 NUMERIC(12, 2),
  pat_fy23 NUMERIC(12, 2),
  pat_fy24 NUMERIC(12, 2),
  pat_fy25 NUMERIC(12, 2),
  ebitda_fy23 NUMERIC(12, 2),
  ebitda_fy24 NUMERIC(12, 2),
  ebitda_fy25 NUMERIC(12, 2),
  roe NUMERIC(6, 2),
  roce NUMERIC(6, 2),
  debt_equity NUMERIC(6, 2),
  eps NUMERIC(10, 2),
  book_value NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Step 5: Create IPO Issue Details table
-- =============================================
CREATE TABLE IF NOT EXISTS ipo_issue_details (
  id SERIAL PRIMARY KEY,
  ipo_id INTEGER REFERENCES ipos(id) ON DELETE CASCADE,
  total_issue_size_cr NUMERIC(10, 2),
  fresh_issue_cr NUMERIC(10, 2),
  fresh_issue_percent NUMERIC(6, 2),
  ofs_cr NUMERIC(10, 2),
  ofs_percent NUMERIC(6, 2),
  retail_quota_percent NUMERIC(6, 2),
  nii_quota_percent NUMERIC(6, 2),
  qib_quota_percent NUMERIC(6, 2),
  employee_quota_percent NUMERIC(6, 2),
  shareholder_quota_percent NUMERIC(6, 2),
  ipo_objectives TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ipo_id)
);

-- =============================================
-- Step 6: Create GMP History table
-- =============================================
CREATE TABLE IF NOT EXISTS gmp_history (
  id SERIAL PRIMARY KEY,
  ipo_id INTEGER REFERENCES ipos(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  gmp NUMERIC(10, 2) NOT NULL,
  gmp_percent NUMERIC(6, 2),
  time_slot TEXT DEFAULT 'morning' CHECK (time_slot IN ('morning', 'evening')),
  source TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index for ipo_id + date + time_slot
CREATE UNIQUE INDEX IF NOT EXISTS gmp_history_ipo_date_slot_unique ON gmp_history(ipo_id, date, time_slot);

-- =============================================
-- Step 7: Create Subscription History table
-- =============================================
CREATE TABLE IF NOT EXISTS subscription_history (
  id SERIAL PRIMARY KEY,
  ipo_id INTEGER REFERENCES ipos(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  retail NUMERIC(10, 2) NOT NULL,
  nii NUMERIC(10, 2) NOT NULL,
  qib NUMERIC(10, 2) NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ipo_id, date, time)
);

-- =============================================
-- Step 8: Create Expert Reviews table
-- =============================================
CREATE TABLE IF NOT EXISTS expert_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ipo_id INTEGER REFERENCES ipos(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  source_type TEXT,
  author TEXT,
  summary TEXT NOT NULL,
  sentiment TEXT DEFAULT 'neutral',
  recommendation TEXT,
  rating INTEGER,
  url TEXT,
  logo_url TEXT,
  review_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Step 9: Create Peer Companies table
-- =============================================
CREATE TABLE IF NOT EXISTS peer_companies (
  id SERIAL PRIMARY KEY,
  ipo_id INTEGER REFERENCES ipos(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  name TEXT,
  market_cap NUMERIC(15, 2),
  revenue NUMERIC(15, 2),
  pat NUMERIC(15, 2),
  pe_ratio NUMERIC(10, 2),
  pb_ratio NUMERIC(10, 2),
  roe NUMERIC(6, 2),
  roce NUMERIC(6, 2),
  debt_equity NUMERIC(6, 2),
  eps NUMERIC(10, 2),
  current_price NUMERIC(10, 2),
  is_ipo_company BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Step 10: Create Listed IPOs table
-- =============================================
CREATE TABLE IF NOT EXISTS listed_ipos (
  id SERIAL PRIMARY KEY,
  original_ipo_id INTEGER REFERENCES ipos(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  name TEXT,
  slug TEXT UNIQUE NOT NULL,
  abbr TEXT,
  bg_color TEXT DEFAULT '#f0f9ff',
  fg_color TEXT DEFAULT '#0369a1',
  exchange TEXT DEFAULT 'Mainboard',
  sector TEXT,
  list_date DATE,
  issue_price NUMERIC(12, 2),
  list_price NUMERIC(12, 2),
  listing_price NUMERIC(10, 2),
  current_price NUMERIC(10, 2),
  gain_pct NUMERIC(8, 2),
  listing_gain_percent NUMERIC(5, 2),
  sub_times NUMERIC(10, 2),
  gmp_peak TEXT,
  ai_pred TEXT,
  ai_err NUMERIC(6, 2),
  year TEXT,
  nse_symbol TEXT,
  bse_scrip_code TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Step 11: Create Reviews table (legacy)
-- =============================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id INTEGER REFERENCES ipos(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  recommendation TEXT,
  rating INTEGER,
  summary TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Step 12: Create Admins table
-- =============================================
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  must_reset_password BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Step 13: Create indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_ipos_status ON ipos(status);
CREATE INDEX IF NOT EXISTS idx_ipos_exchange ON ipos(exchange);
CREATE INDEX IF NOT EXISTS idx_ipos_open_date ON ipos(open_date);
CREATE INDEX IF NOT EXISTS idx_ipos_list_date ON ipos(list_date);
CREATE INDEX IF NOT EXISTS idx_ipos_slug ON ipos(slug);
CREATE INDEX IF NOT EXISTS idx_gmp_history_ipo_id ON gmp_history(ipo_id);
CREATE INDEX IF NOT EXISTS idx_gmp_history_date ON gmp_history(date);
CREATE INDEX IF NOT EXISTS idx_gmp_history_recorded_at ON gmp_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_history_ipo_id ON subscription_history(ipo_id);
CREATE INDEX IF NOT EXISTS idx_expert_reviews_ipo_id ON expert_reviews(ipo_id);
CREATE INDEX IF NOT EXISTS idx_peer_companies_ipo_id ON peer_companies(ipo_id);
CREATE INDEX IF NOT EXISTS idx_listed_ipos_year ON listed_ipos(year);
CREATE INDEX IF NOT EXISTS idx_listed_ipos_slug ON listed_ipos(slug);
CREATE INDEX IF NOT EXISTS idx_reviews_ipo_id ON reviews(ipo_id);
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);

-- =============================================
-- Step 14: Create triggers
-- =============================================
DROP TRIGGER IF EXISTS update_ipos_updated_at ON ipos;
CREATE TRIGGER update_ipos_updated_at
  BEFORE UPDATE ON ipos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_listed_ipos_updated_at ON listed_ipos;
CREATE TRIGGER update_listed_ipos_updated_at
  BEFORE UPDATE ON listed_ipos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_peer_companies_updated_at ON peer_companies;
CREATE TRIGGER update_peer_companies_updated_at
  BEFORE UPDATE ON peer_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admins_updated_at ON admins;
CREATE TRIGGER update_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Step 15: Enable Row Level Security
-- =============================================
ALTER TABLE ipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_issue_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmp_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE listed_ipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Step 16: Create RLS Policies
-- =============================================

-- Drop existing policies first (to avoid conflicts)
DO $$ 
DECLARE
  tables TEXT[] := ARRAY['ipos', 'ipo_financials', 'ipo_issue_details', 'gmp_history', 'subscription_history', 'expert_reviews', 'peer_companies', 'listed_ipos', 'reviews', 'admins'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read access" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Service role full access" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public read on %s" ON %I', t, t);
  END LOOP;
END $$;

-- Public read access for all tables (except admins)
CREATE POLICY "Public read access" ON ipos FOR SELECT USING (true);
CREATE POLICY "Public read access" ON ipo_financials FOR SELECT USING (true);
CREATE POLICY "Public read access" ON ipo_issue_details FOR SELECT USING (true);
CREATE POLICY "Public read access" ON gmp_history FOR SELECT USING (true);
CREATE POLICY "Public read access" ON subscription_history FOR SELECT USING (true);
CREATE POLICY "Public read access" ON expert_reviews FOR SELECT USING (true);
CREATE POLICY "Public read access" ON peer_companies FOR SELECT USING (true);
CREATE POLICY "Public read access" ON listed_ipos FOR SELECT USING (true);
CREATE POLICY "Public read access" ON reviews FOR SELECT USING (true);

-- Service role (admin) full access
CREATE POLICY "Service role full access" ON ipos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON ipo_financials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON ipo_issue_details FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON gmp_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON subscription_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON expert_reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON peer_companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON listed_ipos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON admins FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- Step 17: Create default admin user
-- Username: admin
-- Password: changeme123
-- =============================================
INSERT INTO admins (username, password_hash, must_reset_password)
VALUES (
  'admin',
  '$2a$10$X7VYKvjJQPGhVmEgWWQQFe9XvmF8dF1ELKqH7HkJVmE5V0gX6EFMC',
  true
)
ON CONFLICT (username) DO NOTHING;

-- =============================================
-- DONE! Your database is ready.
-- =============================================
SELECT 'Database setup complete!' as status;
