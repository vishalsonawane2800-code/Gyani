-- ISSUE 1 — Missing columns on ipos table
-- Adds columns required by the ML pipeline (listing_gain_percent is the target variable).

ALTER TABLE ipos ADD COLUMN IF NOT EXISTS pe_ratio NUMERIC(10,2);
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS issue_size_cr NUMERIC(12,2);
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS listing_price NUMERIC(12,2);
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS listing_gain_percent NUMERIC(8,2);

COMMENT ON COLUMN ipos.listing_gain_percent IS 'ML target variable - percent gain on listing day';
