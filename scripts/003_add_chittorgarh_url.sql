-- Add chittorgarh_url column to ipos table for scraping GMP and subscription data
-- Run this in your Supabase SQL Editor

ALTER TABLE ipos ADD COLUMN IF NOT EXISTS chittorgarh_url TEXT;

-- Example: Update an IPO with its Chittorgarh URL
-- UPDATE ipos SET chittorgarh_url = 'https://www.chittorgarh.com/ipo/company-name-ipo/1234/' WHERE slug = 'company-name-ipo';

COMMENT ON COLUMN ipos.chittorgarh_url IS 'Chittorgarh.com IPO page URL for scraping GMP and subscription data';
