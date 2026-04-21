-- Migration 013: Replace ipocentral_gmp_url with ipoji_gmp_url
--
-- Context: IPOCentral is disabled (Cloudflare WAF returns 403 for cloud IPs).
-- ipoji is now the active replacement source. This migration renames the column
-- to reflect the new source and updates documentation.
--
-- Safe to run multiple times in Supabase SQL editor.

-- Step 1: Add new ipoji_gmp_url column
ALTER TABLE IF EXISTS ipos
  ADD COLUMN IF NOT EXISTS ipoji_gmp_url TEXT;

-- Step 2: Copy data from ipocentral to ipoji (if any exists)
UPDATE ipos
  SET ipoji_gmp_url = ipocentral_gmp_url
  WHERE ipocentral_gmp_url IS NOT NULL AND ipoji_gmp_url IS NULL;

-- Step 3: Drop old ipocentral index
DROP INDEX IF EXISTS idx_ipos_ipocentral_gmp_url;

-- Step 4: Create index for ipoji
CREATE INDEX IF NOT EXISTS idx_ipos_ipoji_gmp_url
  ON ipos(ipoji_gmp_url)
  WHERE ipoji_gmp_url IS NOT NULL;

-- Step 5: Update column comments
COMMENT ON COLUMN ipos.ipoji_gmp_url
  IS 'Optional direct ipoji GMP page URL override for this IPO (active replacement for ipocentral)';

-- Step 6: Mark ipocentral column as deprecated in comments
COMMENT ON COLUMN ipos.ipocentral_gmp_url
  IS '[DEPRECATED] Use ipoji_gmp_url instead. Kept for backward compatibility only.';
