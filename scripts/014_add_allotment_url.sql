-- 014_add_allotment_url.sql
-- Adds a per-IPO allotment URL column. Admin-entered via the IPO form.
-- Used by the "Check Allotment" button in components/ipo-detail/page-footer.tsx.
-- If left blank, the UI falls back to the registrar-default URL map.

ALTER TABLE ipos
  ADD COLUMN IF NOT EXISTS allotment_url TEXT;

COMMENT ON COLUMN ipos.allotment_url IS
  'Direct registrar allotment-status URL for this IPO. Overrides the default registrarUrls map in page-footer.tsx.';
