-- Add subscription_source column to track which source (nse | bse | chittorgarh)
-- provided the latest subscription figures. Helpful for debugging and for the
-- UI to show source provenance.

ALTER TABLE ipos
  ADD COLUMN IF NOT EXISTS subscription_source TEXT;

COMMENT ON COLUMN ipos.subscription_source IS
  'Source that provided the latest subscription snapshot: nse | bse | chittorgarh';
