-- =============================================
-- Migration: Add Bulk Data Entry Features
-- - peer_companies table for peer comparison
-- - time_slot column for twice-daily GMP tracking
-- - eps, book_value columns for IPO financials
-- Run this in your Supabase/Cloudflare SQL Editor
-- =============================================

-- 1. Add EPS and Book Value to ipos table (for display on IPO detail page)
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS eps NUMERIC(10,2);
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS book_value NUMERIC(10,2);
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS face_value NUMERIC(10,2);
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS roe NUMERIC(6,2);
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS roce NUMERIC(6,2);
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS debt_equity NUMERIC(6,2);

-- 2. Add time_slot to gmp_history for twice-daily tracking (morning/evening)
ALTER TABLE gmp_history ADD COLUMN IF NOT EXISTS time_slot TEXT DEFAULT 'morning' CHECK (time_slot IN ('morning', 'evening'));

-- Drop old unique constraint and add new one with time_slot
ALTER TABLE gmp_history DROP CONSTRAINT IF EXISTS gmp_history_ipo_id_date_key;
CREATE UNIQUE INDEX IF NOT EXISTS gmp_history_ipo_date_slot_unique ON gmp_history(ipo_id, date, time_slot);

-- 3. Create peer_companies table for peer comparison
CREATE TABLE IF NOT EXISTS peer_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  market_cap NUMERIC(15,2),
  revenue NUMERIC(15,2),
  pat NUMERIC(15,2),
  pe_ratio NUMERIC(10,2),
  pb_ratio NUMERIC(10,2),
  roe NUMERIC(6,2),
  roce NUMERIC(6,2),
  debt_equity NUMERIC(6,2),
  eps NUMERIC(10,2),
  current_price NUMERIC(10,2),
  is_ipo_company BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_peer_companies_ipo_id ON peer_companies(ipo_id);

-- Trigger for updated_at
CREATE TRIGGER update_peer_companies_updated_at
  BEFORE UPDATE ON peer_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS for peer_companies
ALTER TABLE peer_companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access" ON peer_companies;
DROP POLICY IF EXISTS "Service role full access" ON peer_companies;
CREATE POLICY "Public read access" ON peer_companies FOR SELECT USING (true);
CREATE POLICY "Service role full access" ON peer_companies FOR ALL USING (true) WITH CHECK (true);

-- 4. Update ipo_financials to ensure all required columns exist
ALTER TABLE ipo_financials ADD COLUMN IF NOT EXISTS eps NUMERIC(10,2);
ALTER TABLE ipo_financials ADD COLUMN IF NOT EXISTS book_value NUMERIC(10,2);

-- =============================================
-- DONE! Run this migration on your database.
-- =============================================
