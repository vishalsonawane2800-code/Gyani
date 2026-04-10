-- =============================================
-- IPOGyani Complete Fresh Database Setup
-- Run this in Supabase SQL Editor
-- =============================================

-- Step 1: Drop all existing tables (if any)
DROP TABLE IF EXISTS ipo_financials CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS gmp_history CASCADE;
DROP TABLE IF EXISTS listed_ipos CASCADE;
DROP TABLE IF EXISTS ipos CASCADE;

-- Step 2: Create the main IPOs table
CREATE TABLE ipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  exchange TEXT DEFAULT 'Mainboard',
  sector TEXT,
  
  -- Pricing
  price_min NUMERIC(10,2) DEFAULT 0,
  price_max NUMERIC(10,2) DEFAULT 0,
  lot_size INTEGER DEFAULT 0,
  issue_size TEXT,
  
  -- Important Dates
  open_date DATE,
  close_date DATE,
  allotment_date DATE,
  listing_date DATE,
  
  -- Status: upcoming, open, closed, listing, listed
  status TEXT DEFAULT 'upcoming',
  
  -- GMP & Subscription (auto-updated by scrapers)
  gmp INTEGER DEFAULT 0,
  subscription_retail NUMERIC(10,2) DEFAULT 0,
  subscription_shni NUMERIC(10,2) DEFAULT 0,
  subscription_bhni NUMERIC(10,2) DEFAULT 0,
  subscription_qib NUMERIC(10,2) DEFAULT 0,
  subscription_total NUMERIC(10,2) DEFAULT 0,
  subscription_nii NUMERIC(10,2) DEFAULT 0,
  subscription_employee NUMERIC(10,2) DEFAULT 0,
  
  -- AI Prediction
  ai_prediction NUMERIC(5,2) DEFAULT 0,
  ai_confidence NUMERIC(5,2) DEFAULT 50,
  sentiment_score NUMERIC(5,2) DEFAULT 50,
  sentiment_label TEXT DEFAULT 'Neutral',
  
  -- Company Details
  description TEXT,
  registrar TEXT,
  brlm TEXT,
  
  -- Branding
  logo_url TEXT,
  bg_color TEXT DEFAULT '#f0f9ff',
  fg_color TEXT DEFAULT '#0369a1',
  
  -- Scraper URLs
  chittorgarh_url TEXT,
  investorgain_gmp_url TEXT,
  investorgain_sub_url TEXT,
  
  -- Exchange symbols (for listed IPOs)
  nse_symbol TEXT,
  bse_scrip_code TEXT,
  
  -- Listing price (after listing)
  listing_price NUMERIC(10,2),
  current_price NUMERIC(10,2),
  listing_gain_percent NUMERIC(5,2),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_gmp_update TIMESTAMPTZ,
  last_subscription_update TIMESTAMPTZ
);

-- Step 3: Create GMP History table
CREATE TABLE gmp_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
  gmp INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'manual'
);

-- Step 4: Create Listed IPOs table (for migrated IPOs)
CREATE TABLE listed_ipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_ipo_id UUID REFERENCES ipos(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  exchange TEXT DEFAULT 'Mainboard',
  sector TEXT,
  
  -- IPO details
  issue_price NUMERIC(10,2),
  listing_price NUMERIC(10,2),
  current_price NUMERIC(10,2),
  listing_date DATE,
  listing_gain_percent NUMERIC(5,2),
  
  -- Exchange symbols
  nse_symbol TEXT,
  bse_scrip_code TEXT,
  
  -- Branding
  logo_url TEXT,
  bg_color TEXT DEFAULT '#f0f9ff',
  fg_color TEXT DEFAULT '#0369a1',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 5: Create Reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  recommendation TEXT,
  rating INTEGER,
  summary TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Create IPO Financials table (optional)
CREATE TABLE ipo_financials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
  fiscal_year TEXT,
  revenue NUMERIC(15,2),
  profit NUMERIC(15,2),
  assets NUMERIC(15,2),
  liabilities NUMERIC(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 7: Create indexes for faster queries
CREATE INDEX idx_ipos_status ON ipos(status);
CREATE INDEX idx_ipos_slug ON ipos(slug);
CREATE INDEX idx_ipos_open_date ON ipos(open_date);
CREATE INDEX idx_ipos_listing_date ON ipos(listing_date);
CREATE INDEX idx_gmp_history_ipo_id ON gmp_history(ipo_id);
CREATE INDEX idx_gmp_history_recorded_at ON gmp_history(recorded_at DESC);
CREATE INDEX idx_listed_ipos_slug ON listed_ipos(slug);
CREATE INDEX idx_reviews_ipo_id ON reviews(ipo_id);

-- Step 8: Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
CREATE TRIGGER update_ipos_updated_at
  BEFORE UPDATE ON ipos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listed_ipos_updated_at
  BEFORE UPDATE ON listed_ipos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Enable Row Level Security (RLS)
ALTER TABLE ipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmp_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE listed_ipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_financials ENABLE ROW LEVEL SECURITY;

-- Step 10: Create RLS Policies

-- Public read access for all tables
CREATE POLICY "Public read access" ON ipos FOR SELECT USING (true);
CREATE POLICY "Public read access" ON gmp_history FOR SELECT USING (true);
CREATE POLICY "Public read access" ON listed_ipos FOR SELECT USING (true);
CREATE POLICY "Public read access" ON reviews FOR SELECT USING (true);
CREATE POLICY "Public read access" ON ipo_financials FOR SELECT USING (true);

-- Service role (admin) full access
CREATE POLICY "Service role full access" ON ipos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON gmp_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON listed_ipos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON ipo_financials FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- DONE! Your database is ready.
-- =============================================
