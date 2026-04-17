-- Migration 012: Add optional per-source GMP URLs for multi-source scraper
-- Used by app/api/cron/scrape-gmp/route.ts to allow admin overrides per IPO.
-- Columns are nullable; scrapers fall back to their respective listing pages
-- when these are not set.

ALTER TABLE ipos
  ADD COLUMN IF NOT EXISTS ipowatch_gmp_url TEXT,
  ADD COLUMN IF NOT EXISTS ipocentral_gmp_url TEXT;

COMMENT ON COLUMN ipos.ipowatch_gmp_url
  IS 'Optional direct IPOWatch GMP page URL for this IPO';
COMMENT ON COLUMN ipos.ipocentral_gmp_url
  IS 'Optional direct IPOCentral GMP page URL for this IPO';
