-- =============================================================================
-- 029_ipo_news_admin.sql
-- =============================================================================
-- Extends the existing `ipo_news` table (migration 004_automation_extensions.sql)
-- with admin-dashboard columns so per-IPO news items can be managed alongside
-- `market_news`:
--
--   - is_published  BOOLEAN      Admin can unpublish without deleting.
--   - display_order INTEGER      Higher = pinned higher on the public feed.
--   - tag           TEXT         Short pill label (NEWS / ALERT / LISTING ...).
--                                Optional. Display-only.
--   - impact        TEXT         Inline impact badge (Bullish / Caution ...).
--                                Optional. Display-only.
--   - updated_at    TIMESTAMPTZ  Auto-maintained mtime.
--
-- Also adds a trigger to keep `updated_at` fresh and a public-read RLS policy
-- so the anon role can fetch published items for the /news page.
--
-- Run this in Supabase SQL Editor. Idempotent - safe to re-run.
-- =============================================================================

ALTER TABLE ipo_news
  ADD COLUMN IF NOT EXISTS is_published  BOOLEAN      NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS display_order INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tag           TEXT,
  ADD COLUMN IF NOT EXISTS impact        TEXT,
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW();

-- Common access pattern for the public /news feed: "published, newest / pinned
-- first". We already have idx_ipo_news_ipo_published from migration 004 for
-- the per-IPO detail page.
CREATE INDEX IF NOT EXISTS idx_ipo_news_public_feed
  ON ipo_news (is_published, display_order DESC, published_at DESC NULLS LAST);

-- Keep updated_at fresh on every update (same pattern as market_news).
CREATE OR REPLACE FUNCTION ipo_news_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ipo_news_updated_at ON ipo_news;
CREATE TRIGGER trg_ipo_news_updated_at
  BEFORE UPDATE ON ipo_news
  FOR EACH ROW EXECUTE FUNCTION ipo_news_set_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================
-- Admin writes go through the service-role key (createAdminClient), which
-- bypasses RLS. For anon/authenticated reads we expose only published items.
-- Mirrors the market_news policy so the public /news page can hit PostgREST
-- directly if ever needed.
-- =============================================================================
ALTER TABLE ipo_news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ipo_news_public_read" ON ipo_news;
CREATE POLICY "ipo_news_public_read"
  ON ipo_news
  FOR SELECT
  TO anon, authenticated
  USING (is_published = TRUE);

-- Make the new columns visible to PostgREST immediately.
NOTIFY pgrst, 'reload schema';
