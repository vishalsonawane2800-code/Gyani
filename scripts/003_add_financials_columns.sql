-- =============================================
-- Add missing columns to ipo_financials table
-- Run this in your database SQL editor
-- =============================================

-- Add PAT column (renamed from profit for clarity)
ALTER TABLE ipo_financials ADD COLUMN IF NOT EXISTS pat NUMERIC(15,2);

-- Copy data from profit to pat if profit exists
UPDATE ipo_financials SET pat = profit WHERE pat IS NULL AND profit IS NOT NULL;

-- Add EBITDA column
ALTER TABLE ipo_financials ADD COLUMN IF NOT EXISTS ebitda NUMERIC(15,2);

-- Add ratio columns
ALTER TABLE ipo_financials ADD COLUMN IF NOT EXISTS roe NUMERIC(5,2);
ALTER TABLE ipo_financials ADD COLUMN IF NOT EXISTS roce NUMERIC(5,2);
ALTER TABLE ipo_financials ADD COLUMN IF NOT EXISTS debt_equity NUMERIC(5,2);
ALTER TABLE ipo_financials ADD COLUMN IF NOT EXISTS net_worth NUMERIC(15,2);

-- =============================================
-- DONE! Run this migration on your database.
-- =============================================
