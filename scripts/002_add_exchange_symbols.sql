-- Add exchange-specific symbols for subscription scraping
-- These are needed to fetch subscription data from NSE/BSE APIs

ALTER TABLE ipos ADD COLUMN IF NOT EXISTS nse_symbol TEXT;
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS bse_scrip_code TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ipos_nse_symbol ON ipos(nse_symbol);
CREATE INDEX IF NOT EXISTS idx_ipos_bse_scrip_code ON ipos(bse_scrip_code);

-- Example: Update existing IPOs with their symbols
-- UPDATE ipos SET nse_symbol = 'COMPANYIPO' WHERE slug = 'company-ipo';
-- UPDATE ipos SET bse_scrip_code = '123456' WHERE slug = 'company-ipo';
