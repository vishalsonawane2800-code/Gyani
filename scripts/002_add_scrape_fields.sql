-- IPOGyani Database Migration: Add Scrape URL Fields
-- Run this in your Supabase SQL Editor after 001_create_ipo_tables.sql
-- This adds fields to store scrape URLs for automatic GMP/subscription updates

-- Add scrape URL columns to ipos table if they don't exist
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS chittorgarh_url TEXT;
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS investorgain_gmp_url TEXT;
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS investorgain_sub_url TEXT;
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS nse_symbol TEXT;
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS bse_scrip_code TEXT;

-- Add gmp column directly on ipos table for quick access (current GMP)
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS gmp NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS gmp_percent NUMERIC(6, 2) DEFAULT 0;

-- Add last_scraped timestamp to track when data was last fetched
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMPTZ;

-- Create index for faster scrape URL lookups
CREATE INDEX IF NOT EXISTS idx_ipos_chittorgarh_url ON ipos(chittorgarh_url) WHERE chittorgarh_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ipos_investorgain_gmp_url ON ipos(investorgain_gmp_url) WHERE investorgain_gmp_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ipos_investorgain_sub_url ON ipos(investorgain_sub_url) WHERE investorgain_sub_url IS NOT NULL;

-- Add recorded_at to gmp_history if date column exists but recorded_at doesn't
-- (Backwards compatibility with different versions of the schema)
ALTER TABLE gmp_history ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ DEFAULT NOW();

-- Create allotment_results table to store allotment status data
CREATE TABLE IF NOT EXISTS allotment_results (
  id SERIAL PRIMARY KEY,
  ipo_id INTEGER REFERENCES ipos(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'retail', 'nii', 'qib', 'employee', 'shareholder'
  applications_received INTEGER,
  lots_available INTEGER,
  allotment_ratio TEXT, -- e.g., "1:5" meaning 1 lot per 5 applications
  cutoff_lots INTEGER, -- minimum lots to get allotment
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ipo_id, category)
);

-- Enable RLS on allotment_results
ALTER TABLE allotment_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on allotment_results" ON allotment_results FOR SELECT USING (true);

-- Create index for allotment results
CREATE INDEX IF NOT EXISTS idx_allotment_results_ipo_id ON allotment_results(ipo_id);

-- Add comments for documentation
COMMENT ON COLUMN ipos.chittorgarh_url IS 'URL for Chittorgarh IPO details page - used for basic IPO info scraping';
COMMENT ON COLUMN ipos.investorgain_gmp_url IS 'URL for InvestorGain GMP page - used for live GMP scraping';
COMMENT ON COLUMN ipos.investorgain_sub_url IS 'URL for InvestorGain subscription page - used for live subscription scraping';
COMMENT ON COLUMN ipos.nse_symbol IS 'NSE trading symbol - used for NSE API subscription data';
COMMENT ON COLUMN ipos.bse_scrip_code IS 'BSE scrip code - used for BSE API subscription data';
COMMENT ON COLUMN ipos.last_scraped_at IS 'Timestamp of last successful data scrape';

-- Grant permissions for service role (for API updates)
-- Note: These are applied through RLS policies
-- INSERT/UPDATE policies for service role should be added based on your auth setup
