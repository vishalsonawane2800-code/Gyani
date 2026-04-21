-- Verification query to check the ipoji_gmp_url migration status
-- Run this AFTER running 013_replace_ipocentral_with_ipoji.sql

-- 1. Check that ipoji_gmp_url column exists and has data
SELECT 
  COUNT(*) as total_ipos,
  COUNT(CASE WHEN ipocentral_gmp_url IS NOT NULL THEN 1 END) as with_ipocentral,
  COUNT(CASE WHEN ipoji_gmp_url IS NOT NULL THEN 1 END) as with_ipoji,
  COUNT(CASE WHEN ipocentral_gmp_url IS NOT NULL AND ipoji_gmp_url IS NOT NULL THEN 1 END) as migrated_both,
  COUNT(CASE WHEN ipocentral_gmp_url IS NOT NULL AND ipoji_gmp_url IS NULL THEN 1 END) as not_migrated
FROM ipos;

-- 2. Check the column definition exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ipos' AND column_name IN ('ipocentral_gmp_url', 'ipoji_gmp_url')
ORDER BY column_name;

-- 3. Check the indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'ipos' AND indexname LIKE 'idx_ipos_%gmp_url'
ORDER BY indexname;
