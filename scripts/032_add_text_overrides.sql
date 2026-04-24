-- =============================================
-- Migration 032: Preserve admin-typed "NA" / "-" for numeric fields
--
-- Problem: our numeric columns (NUMERIC(15,2)) cannot hold the literal
-- strings "NA" or "-" that admins sometimes type to indicate "not
-- available". The existing bulk parser silently dropped those tokens,
-- which resulted in NULL in the DB and then "0" / "Rs 0 Cr" in the UI.
--
-- Fix: add a JSONB `text_overrides` column on the three tables that feed
-- the IPO detail page (ipo_financials, ipo_kpi, ipos). The bulk parsers
-- now capture the admin's literal text ("NA", "-", "N/A", etc.) into
-- this map, keyed by field name. The public query layer merges these
-- overrides into IPO.textOverrides so the UI can render the exact
-- string the admin typed instead of a misleading "0".
--
-- Idempotent: IF NOT EXISTS guards allow re-running on any environment.
-- =============================================

ALTER TABLE ipo_financials
  ADD COLUMN IF NOT EXISTS text_overrides JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN ipo_financials.text_overrides IS
  'Admin-supplied text overrides (e.g. {"revenue":"NA","pat":"-"}) for numeric columns on this row. Keys are lower_snake field names.';

ALTER TABLE ipos
  ADD COLUMN IF NOT EXISTS text_overrides JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN ipos.text_overrides IS
  'Admin-supplied text overrides (e.g. {"pe_ratio":"NA"}) for numeric columns on the IPO row.';

-- ipo_kpi already has a `text_value` column used for promoters/disclaimer
-- text. We add a parallel `text_override` column specifically for numeric
-- metrics (ROE/ROCE/PE/EPS...) where admin typed NA/-. This keeps the
-- two concerns separate: text_value is the primary string payload for
-- text-only rows; text_override is the display-preservation marker for
-- numeric rows whose `value` column is NULL.
ALTER TABLE ipo_kpi
  ADD COLUMN IF NOT EXISTS text_override TEXT;

COMMENT ON COLUMN ipo_kpi.text_override IS
  'Admin-typed non-numeric token (e.g. "NA", "-") for this KPI metric. Used when value is NULL so the UI can display the literal string instead of 0.';

-- =============================================
-- DONE! Run this migration on your new Supabase project.
-- =============================================
