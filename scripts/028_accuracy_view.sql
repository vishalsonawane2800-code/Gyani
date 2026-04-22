-- ============================================================
-- 028_accuracy_view.sql
-- AI Prediction Accuracy dashboard support
-- ============================================================
--
-- The AI accuracy page at /accuracy uses three columns that already
-- exist on the `ipos` table: `ai_prediction`, `gmp_percent`, and
-- `listing_gain_percent`. No schema change is strictly required.
--
-- This script is a safe, idempotent helper that:
--   1. Backfills `listing_gain_percent` from `listing_price` and
--      `price_max` for listed rows that are missing it.
--   2. Adds an optional `gmp_peak_percent` column so the UI can show
--      the peak GMP-implied gain (often different from the final
--      `gmp_percent` captured at the last scrape).
--   3. Creates / replaces a `accuracy_recent_listings` VIEW with
--      computed AI error, GMP error, and hit flags per listed IPO,
--      which the server-side queries can read from if you ever want
--      to move the math out of JS.
--
-- It only reads/writes already-listed rows (status = 'listed'), so it
-- is safe to re-run and will never touch live / upcoming IPOs.
-- ============================================================

-- 1. Backfill listing_gain_percent where it is NULL but we can derive it
UPDATE ipos
SET listing_gain_percent = ROUND(((listing_price - price_max) / price_max) * 100, 2)
WHERE status = 'listed'
  AND listing_gain_percent IS NULL
  AND listing_price IS NOT NULL
  AND price_max IS NOT NULL
  AND price_max > 0;

-- 2. Add an optional peak-GMP percent column (for future accuracy snapshots)
ALTER TABLE ipos
  ADD COLUMN IF NOT EXISTS gmp_peak_percent NUMERIC(8, 2);

COMMENT ON COLUMN ipos.gmp_peak_percent IS
  'Peak GMP-implied listing gain (%). Captured at close / peak hype. Used by the /accuracy dashboard to compare GMP vs AI predictions.';

-- Seed gmp_peak_percent with gmp_percent for already-listed rows so
-- the dashboard has something to compare against immediately.
UPDATE ipos
SET gmp_peak_percent = gmp_percent
WHERE status = 'listed'
  AND gmp_peak_percent IS NULL
  AND gmp_percent IS NOT NULL;

-- 3. Create / replace the accuracy view
DROP VIEW IF EXISTS accuracy_recent_listings;

CREATE VIEW accuracy_recent_listings AS
SELECT
  i.id,
  i.slug,
  i.name,
  i.abbr,
  i.bg_color,
  i.fg_color,
  i.logo_url,
  i.exchange,
  i.sector,
  i.listing_date,
  i.close_date,
  i.price_max                         AS issue_price,
  i.listing_price,
  i.subscription_total,
  i.gmp                               AS gmp_peak_abs,
  COALESCE(i.gmp_peak_percent, i.gmp_percent, 0) AS gmp_pred_gain,
  i.ai_prediction                     AS ai_pred,
  i.listing_gain_percent              AS actual_gain,
  -- absolute errors
  ROUND(ABS(COALESCE(i.ai_prediction, 0) - COALESCE(i.listing_gain_percent, 0))::NUMERIC, 2) AS ai_err,
  ROUND(ABS(COALESCE(i.gmp_peak_percent, i.gmp_percent, 0) - COALESCE(i.listing_gain_percent, 0))::NUMERIC, 2) AS gmp_err,
  -- hit flags (within 5% error)
  (ABS(COALESCE(i.ai_prediction, 0) - COALESCE(i.listing_gain_percent, 0)) <= 5) AS ai_hit,
  (ABS(COALESCE(i.gmp_peak_percent, i.gmp_percent, 0) - COALESCE(i.listing_gain_percent, 0)) <= 5) AS gmp_hit,
  -- direction match flags
  (SIGN(COALESCE(i.ai_prediction, 0)) = SIGN(COALESCE(i.listing_gain_percent, 0))) AS ai_dir_ok,
  (SIGN(COALESCE(i.gmp_peak_percent, i.gmp_percent, 0)) = SIGN(COALESCE(i.listing_gain_percent, 0))) AS gmp_dir_ok
FROM ipos i
WHERE i.status = 'listed'
  AND i.listing_gain_percent IS NOT NULL
ORDER BY i.listing_date DESC NULLS LAST, i.close_date DESC;

COMMENT ON VIEW accuracy_recent_listings IS
  'Per-IPO accuracy snapshot used by the /accuracy dashboard. Read-only. Re-runnable via 028_accuracy_view.sql.';

-- Public read access (mirrors the ipos RLS policy)
GRANT SELECT ON accuracy_recent_listings TO anon, authenticated;
