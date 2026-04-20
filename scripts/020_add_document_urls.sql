-- =========================================================================
-- 020_add_document_urls.sql
-- Adds DRHP, RHP, and Anchor Investors URL fields to the ipos table.
-- These are rendered as buttons at the bottom of the public IPO detail
-- page when populated, and managed via the admin IPO form.
--
-- Idempotent: safe to re-run.
-- =========================================================================

ALTER TABLE ipos
  ADD COLUMN IF NOT EXISTS drhp_url              TEXT,
  ADD COLUMN IF NOT EXISTS rhp_url               TEXT,
  ADD COLUMN IF NOT EXISTS anchor_investors_url  TEXT;

COMMENT ON COLUMN ipos.drhp_url
  IS 'Public URL (PDF) of the Draft Red Herring Prospectus.';
COMMENT ON COLUMN ipos.rhp_url
  IS 'Public URL (PDF) of the Red Herring Prospectus.';
COMMENT ON COLUMN ipos.anchor_investors_url
  IS 'Public URL (PDF or exchange announcement) listing anchor investors.';

-- Refresh PostgREST schema cache so supabase-js can see the new columns.
NOTIFY pgrst, 'reload schema';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ipos'
  AND column_name IN ('drhp_url', 'rhp_url', 'anchor_investors_url')
ORDER BY column_name;
