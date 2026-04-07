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
