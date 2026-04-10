-- =============================================
-- Migration: Fix gmp_history + add subscription_history
-- Run this in your Supabase/Cloudflare SQL Editor
-- =============================================

-- Add 'date' column to gmp_history for daily deduplication
ALTER TABLE gmp_history ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE gmp_history ADD COLUMN IF NOT EXISTS gmp_percent NUMERIC(6,2) DEFAULT 0;

-- Backfill date from recorded_at
UPDATE gmp_history SET date = recorded_at::DATE WHERE date IS NULL;

-- Add unique constraint for daily GMP per IPO
ALTER TABLE gmp_history DROP CONSTRAINT IF EXISTS gmp_history_ipo_id_date_key;
ALTER TABLE gmp_history ADD CONSTRAINT gmp_history_ipo_id_date_key UNIQUE (ipo_id, date);

-- Add gmp_percent and last_scraped_at to ipos table
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS gmp_percent NUMERIC(6,2) DEFAULT 0;
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS gmp_last_updated TIMESTAMPTZ;
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMPTZ;
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS subscription_day INTEGER DEFAULT 0;
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS subscription_is_final BOOLEAN DEFAULT FALSE;

-- Create subscription_history table
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TEXT NOT NULL DEFAULT '00:00',
  retail NUMERIC(10,2) DEFAULT 0,
  nii NUMERIC(10,2) DEFAULT 0,
  qib NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ipo_id, date, time)
);

-- Add ebitda, roe, roce, debt_equity to ipo_financials
ALTER TABLE ipo_financials ADD COLUMN IF NOT EXISTS ebitda NUMERIC(15,2) DEFAULT 0;
ALTER TABLE ipo_financials ADD COLUMN IF NOT EXISTS roe NUMERIC(6,2) DEFAULT 0;
ALTER TABLE ipo_financials ADD COLUMN IF NOT EXISTS roce NUMERIC(6,2) DEFAULT 0;
ALTER TABLE ipo_financials ADD COLUMN IF NOT EXISTS debt_equity NUMERIC(6,2) DEFAULT 0;
ALTER TABLE ipo_financials ADD COLUMN IF NOT EXISTS net_worth NUMERIC(15,2) DEFAULT 0;
-- Rename profit to pat (if exists as profit, add pat column)
ALTER TABLE ipo_financials ADD COLUMN IF NOT EXISTS pat NUMERIC(15,2) DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gmp_history_date ON gmp_history(date DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_history_ipo_id ON subscription_history(ipo_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_date ON subscription_history(date DESC);

-- RLS for new tables
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Public read access" ON subscription_history FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON subscription_history FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- DONE!
-- =============================================
