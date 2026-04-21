-- Migration 012: Add optional per-source GMP URL overrides.
--
-- Safe to run multiple times in Supabase SQL editor.
-- Notes:
--   - `investorgain_gmp_url` was introduced earlier in migration 002.
--   - These two columns allow per-IPO URL overrides for additional sources.

ALTER TABLE IF EXISTS ipos
  ADD COLUMN IF NOT EXISTS ipowatch_gmp_url TEXT;

ALTER TABLE IF EXISTS ipos
  ADD COLUMN IF NOT EXISTS ipocentral_gmp_url TEXT;

-- Optional indexes for operational/debug queries on configured overrides.
CREATE INDEX IF NOT EXISTS idx_ipos_ipowatch_gmp_url
  ON ipos(ipowatch_gmp_url)
  WHERE ipowatch_gmp_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ipos_ipocentral_gmp_url
  ON ipos(ipocentral_gmp_url)
  WHERE ipocentral_gmp_url IS NOT NULL;

COMMENT ON COLUMN ipos.ipowatch_gmp_url
  IS 'Optional direct IPOWatch GMP page URL override for this IPO';

COMMENT ON COLUMN ipos.ipocentral_gmp_url
  IS 'Optional direct IPOCentral GMP page URL override for this IPO';
