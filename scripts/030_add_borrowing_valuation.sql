-- =============================================
-- Migration 030: Add borrowing and valuation columns to ipo_financials
--
-- Company Financials in the UI has 5 tabs: Revenue, Net Profit, EBITDA,
-- Valuation, and Borrowing. The first three are stored per fiscal year
-- already. Valuation and Borrowing were previously derived from marketCap
-- and debt_equity multipliers (effectively mocked). This migration adds
-- real per-year storage so the admin bulk data entry template can capture
-- them alongside the rest of the financial history.
--
-- Idempotent: IF NOT EXISTS guards allow re-running on any environment.
-- =============================================

ALTER TABLE ipo_financials
  ADD COLUMN IF NOT EXISTS borrowing NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS valuation NUMERIC(15, 2);

-- Optional helpful comments for downstream tooling
COMMENT ON COLUMN ipo_financials.borrowing IS 'Total borrowings / debt (Rs Cr) for the fiscal year';
COMMENT ON COLUMN ipo_financials.valuation IS 'Company valuation / enterprise value (Rs Cr) for the fiscal year';

-- =============================================
-- DONE! Run this migration on your database.
-- =============================================
