-- =============================================
-- Migration 021: FAQs + long-form IPO/Company content
-- - Adds ipo_faqs table for SEO-friendly FAQ blocks
--   (structured data / FAQPage JSON-LD on public IPO page)
-- - Adds company_details + ipo_details_long to ipos
--   (long-form copy that powers the public "Read more"
--    blocks on the IPO detail page). about_company
--    remains the short 1-2 sentence summary.
--
-- Safe to run multiple times (CREATE IF NOT EXISTS + IF NOT EXISTS guards).
-- =============================================

-- ------------------------------------------------
-- 1. Long-form content columns on ipos
-- ------------------------------------------------
ALTER TABLE ipos
  ADD COLUMN IF NOT EXISTS company_details TEXT,
  ADD COLUMN IF NOT EXISTS ipo_details_long TEXT;

COMMENT ON COLUMN ipos.company_details
  IS 'Long-form company description (business, products, promoters, moat). Rendered in the "About Company" read-more block.';
COMMENT ON COLUMN ipos.ipo_details_long
  IS 'Long-form IPO commentary (review, strengths, risks, valuation notes). Rendered in the "About IPO" read-more block.';

-- ------------------------------------------------
-- 2. ipo_faqs table
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS ipo_faqs (
  id              SERIAL PRIMARY KEY,
  ipo_id          INTEGER NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
  question        TEXT NOT NULL,
  answer          TEXT NOT NULL,
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ipo_faqs_ipo_id
  ON ipo_faqs(ipo_id, display_order);

-- Trigger for updated_at (function is created in 007_complete_setup.sql)
DROP TRIGGER IF EXISTS update_ipo_faqs_updated_at ON ipo_faqs;
CREATE TRIGGER update_ipo_faqs_updated_at
  BEFORE UPDATE ON ipo_faqs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------
-- 3. RLS — public read, service-role write
-- ------------------------------------------------
ALTER TABLE ipo_faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON ipo_faqs;
DROP POLICY IF EXISTS "Service role full access" ON ipo_faqs;

CREATE POLICY "Public read access"
  ON ipo_faqs FOR SELECT USING (true);

CREATE POLICY "Service role full access"
  ON ipo_faqs FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- DONE
-- =============================================
SELECT 'FAQs + long-form content migration applied' AS status;
