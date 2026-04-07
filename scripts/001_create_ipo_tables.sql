-- IPOGyani Database Schema Migration
-- Creates all necessary tables for IPO data storage

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- IPO Status Enum
CREATE TYPE ipo_status AS ENUM ('open', 'lastday', 'allot', 'listing', 'upcoming', 'closed');

-- Exchange Type Enum
CREATE TYPE exchange_type AS ENUM ('BSE SME', 'NSE SME', 'Mainboard', 'REIT');

-- Sentiment Label Enum
CREATE TYPE sentiment_label AS ENUM ('Bullish', 'Neutral', 'Bearish');

-- Expert Review Source Type Enum
CREATE TYPE review_source_type AS ENUM ('youtube', 'analyst', 'news', 'firm');

-- Expert Review Sentiment Enum
CREATE TYPE review_sentiment AS ENUM ('positive', 'neutral', 'negative');

-- Main IPOs Table (Current/Upcoming IPOs)
CREATE TABLE IF NOT EXISTS ipos (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  abbr TEXT NOT NULL,
  bg_color TEXT DEFAULT '#f0f9ff',
  fg_color TEXT DEFAULT '#0369a1',
  exchange exchange_type NOT NULL,
  sector TEXT NOT NULL,
  open_date DATE NOT NULL,
  close_date DATE NOT NULL,
  allotment_date DATE NOT NULL,
  list_date DATE NOT NULL,
  price_min NUMERIC(12, 2) NOT NULL,
  price_max NUMERIC(12, 2) NOT NULL,
  lot_size INTEGER NOT NULL,
  issue_size TEXT NOT NULL,
  issue_size_cr NUMERIC(10, 2) NOT NULL,
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
  subscription_day INTEGER DEFAULT 0,
  subscription_is_final BOOLEAN DEFAULT FALSE,
  ai_prediction NUMERIC(6, 2) DEFAULT 0,
  ai_confidence INTEGER DEFAULT 50,
  sentiment_score INTEGER DEFAULT 50,
  sentiment_label sentiment_label DEFAULT 'Neutral',
  status ipo_status DEFAULT 'upcoming',
  registrar TEXT,
  lead_manager TEXT,
  market_cap TEXT,
  pe_ratio NUMERIC(8, 2) DEFAULT 0,
  about_company TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- IPO Financials Table (One-to-One with IPO)
CREATE TABLE IF NOT EXISTS ipo_financials (
  id SERIAL PRIMARY KEY,
  ipo_id INTEGER UNIQUE REFERENCES ipos(id) ON DELETE CASCADE,
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- IPO Issue Details Table (One-to-One with IPO)
CREATE TABLE IF NOT EXISTS ipo_issue_details (
  id SERIAL PRIMARY KEY,
  ipo_id INTEGER UNIQUE REFERENCES ipos(id) ON DELETE CASCADE,
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
  ipo_objectives TEXT[], -- Array of objectives
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GMP History Table (One-to-Many with IPO)
CREATE TABLE IF NOT EXISTS gmp_history (
  id SERIAL PRIMARY KEY,
  ipo_id INTEGER REFERENCES ipos(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  gmp NUMERIC(10, 2) NOT NULL,
  gmp_percent NUMERIC(6, 2) NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ipo_id, date)
);

-- Subscription History Table (One-to-Many with IPO)
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

-- Expert Reviews Table (One-to-Many with IPO)
CREATE TABLE IF NOT EXISTS expert_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ipo_id INTEGER REFERENCES ipos(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  source_type review_source_type NOT NULL,
  author TEXT NOT NULL,
  summary TEXT NOT NULL,
  sentiment review_sentiment DEFAULT 'neutral',
  url TEXT,
  logo_url TEXT,
  review_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Peer Companies Table (One-to-Many with IPO)
CREATE TABLE IF NOT EXISTS peer_companies (
  id SERIAL PRIMARY KEY,
  ipo_id INTEGER REFERENCES ipos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  market_cap NUMERIC(14, 2),
  revenue NUMERIC(14, 2),
  pat NUMERIC(14, 2),
  pe_ratio NUMERIC(8, 2),
  pb_ratio NUMERIC(8, 2),
  roe NUMERIC(8, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Listed IPOs Table (Historical IPOs that have already listed)
CREATE TABLE IF NOT EXISTS listed_ipos (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  abbr TEXT NOT NULL,
  bg_color TEXT DEFAULT '#f0f9ff',
  fg_color TEXT DEFAULT '#0369a1',
  exchange exchange_type NOT NULL,
  sector TEXT NOT NULL,
  list_date DATE NOT NULL,
  issue_price NUMERIC(12, 2) NOT NULL,
  list_price NUMERIC(12, 2) NOT NULL,
  gain_pct NUMERIC(8, 2) NOT NULL,
  sub_times NUMERIC(10, 2),
  gmp_peak TEXT,
  ai_pred TEXT,
  ai_err NUMERIC(6, 2),
  year TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ipos_status ON ipos(status);
CREATE INDEX IF NOT EXISTS idx_ipos_exchange ON ipos(exchange);
CREATE INDEX IF NOT EXISTS idx_ipos_open_date ON ipos(open_date);
CREATE INDEX IF NOT EXISTS idx_ipos_list_date ON ipos(list_date);
CREATE INDEX IF NOT EXISTS idx_ipos_slug ON ipos(slug);

CREATE INDEX IF NOT EXISTS idx_listed_ipos_year ON listed_ipos(year);
CREATE INDEX IF NOT EXISTS idx_listed_ipos_exchange ON listed_ipos(exchange);
CREATE INDEX IF NOT EXISTS idx_listed_ipos_list_date ON listed_ipos(list_date);
CREATE INDEX IF NOT EXISTS idx_listed_ipos_slug ON listed_ipos(slug);

CREATE INDEX IF NOT EXISTS idx_gmp_history_ipo_id ON gmp_history(ipo_id);
CREATE INDEX IF NOT EXISTS idx_gmp_history_date ON gmp_history(date);

CREATE INDEX IF NOT EXISTS idx_subscription_history_ipo_id ON subscription_history(ipo_id);

CREATE INDEX IF NOT EXISTS idx_expert_reviews_ipo_id ON expert_reviews(ipo_id);

CREATE INDEX IF NOT EXISTS idx_peer_companies_ipo_id ON peer_companies(ipo_id);

-- Enable Row Level Security (public read, admin write)
ALTER TABLE ipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_issue_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmp_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE listed_ipos ENABLE ROW LEVEL SECURITY;

-- Public read access policies (anyone can read IPO data)
CREATE POLICY "Allow public read on ipos" ON ipos FOR SELECT USING (true);
CREATE POLICY "Allow public read on ipo_financials" ON ipo_financials FOR SELECT USING (true);
CREATE POLICY "Allow public read on ipo_issue_details" ON ipo_issue_details FOR SELECT USING (true);
CREATE POLICY "Allow public read on gmp_history" ON gmp_history FOR SELECT USING (true);
CREATE POLICY "Allow public read on subscription_history" ON subscription_history FOR SELECT USING (true);
CREATE POLICY "Allow public read on expert_reviews" ON expert_reviews FOR SELECT USING (true);
CREATE POLICY "Allow public read on peer_companies" ON peer_companies FOR SELECT USING (true);
CREATE POLICY "Allow public read on listed_ipos" ON listed_ipos FOR SELECT USING (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on ipos table
CREATE TRIGGER update_ipos_updated_at
  BEFORE UPDATE ON ipos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
