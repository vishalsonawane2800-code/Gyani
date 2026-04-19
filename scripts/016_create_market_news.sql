-- =============================================================================
-- 016_create_market_news.sql
-- =============================================================================
-- Creates a `market_news` table for editorial / homepage "IPO Market News"
-- items. This is distinct from the existing per-IPO `ipo_news` table
-- (migration 004_automation_extensions.sql) which is scraped and tied to a
-- specific IPO via `ipo_id`. Market news entries are manually curated from the
-- admin panel and are not required to reference a specific IPO.
--
-- Run this in Supabase SQL Editor. Idempotent - safe to re-run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS market_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  source TEXT,
  -- Short pill label shown before the title (e.g. ALERT, MARKET, IPO, REG).
  tag TEXT NOT NULL DEFAULT 'IPO',
  -- Inline impact badge shown next to the title
  -- (e.g. Bullish, Bearish, Caution, Watch, Neutral).
  impact TEXT,
  -- Optional normalized sentiment for analytics / filtering.
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  image_url TEXT,
  summary TEXT,
  -- When the article was originally published at the source.
  published_at TIMESTAMPTZ,
  -- Admin can unpublish without deleting.
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  -- Manual pin order. Lower = higher on the page. 0 = unpinned.
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes: common access patterns are "latest published" and "pinned first".
CREATE INDEX IF NOT EXISTS idx_market_news_published_at
  ON market_news (published_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_market_news_is_published_order
  ON market_news (is_published, display_order DESC, published_at DESC NULLS LAST);

-- Keep updated_at fresh on every update.
CREATE OR REPLACE FUNCTION market_news_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_market_news_updated_at ON market_news;
CREATE TRIGGER trg_market_news_updated_at
  BEFORE UPDATE ON market_news
  FOR EACH ROW EXECUTE FUNCTION market_news_set_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================
-- Public users (anon role) can read published entries only.
-- Writes are performed exclusively via the service-role key from the admin
-- API routes (see app/api/admin/market-news), so no anon/authenticated
-- INSERT/UPDATE/DELETE policies are needed.
-- =============================================================================
ALTER TABLE market_news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "market_news_public_read" ON market_news;
CREATE POLICY "market_news_public_read"
  ON market_news
  FOR SELECT
  TO anon, authenticated
  USING (is_published = TRUE);

-- Make the new schema visible to PostgREST immediately.
NOTIFY pgrst, 'reload schema';
