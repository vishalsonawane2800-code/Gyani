-- Migration 004: Automation extensions
-- Extends existing schema to support scrapers, news, YouTube summaries,
-- ML predictions, scraper health, and model registry.
-- All new columns are nullable so existing rows are preserved.

-- =============================================================================
-- A) Extend `ipos` with automation + enrichment columns
-- =============================================================================
ALTER TABLE ipos
  ADD COLUMN IF NOT EXISTS gmp_sources_used TEXT[],
  ADD COLUMN IF NOT EXISTS subscription_last_scraped TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS news_last_fetched TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS youtube_last_fetched TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS prediction_last_generated TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS anchor_investors JSONB,
  ADD COLUMN IF NOT EXISTS promoter_holding_pre NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS promoter_holding_post NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS sector_pe NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS fresh_issue_cr NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS ofs_cr NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS listing_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS listing_gain_percent NUMERIC(8,2);

-- Note: pe_ratio and issue_size_cr are already defined on ipos in 001_create_ipo_tables.sql.
-- They are intentionally omitted here to avoid type conflicts with the existing columns.

-- =============================================================================
-- B) Extend `gmp_history` with kostak / subject-to-sauda
-- =============================================================================
ALTER TABLE gmp_history
  ADD COLUMN IF NOT EXISTS kostak NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS subject_to_sauda NUMERIC(10,2);

-- =============================================================================
-- C) Extend `subscription_history` with per-category x-times + metadata
-- =============================================================================
ALTER TABLE subscription_history
  ADD COLUMN IF NOT EXISTS qib_x NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS nii_big_x NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS nii_small_x NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS retail_x NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS employee_x NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS shareholder_x NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS total_x NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS total_applications BIGINT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ;

-- =============================================================================
-- D) New table: ipo_news
-- =============================================================================
CREATE TABLE IF NOT EXISTS ipo_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id INTEGER NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  source TEXT,
  image_url TEXT,
  published_at TIMESTAMPTZ,
  summary TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ipo_news_ipo_published
  ON ipo_news (ipo_id, published_at DESC);

-- =============================================================================
-- E) New table: ipo_youtube_summaries
-- =============================================================================
CREATE TABLE IF NOT EXISTS ipo_youtube_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id INTEGER NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
  video_id TEXT UNIQUE NOT NULL,
  video_url TEXT,
  channel_name TEXT,
  thumbnail_url TEXT,
  view_count BIGINT,
  published_at TIMESTAMPTZ,
  ai_summary TEXT,
  key_points TEXT[],
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ipo_youtube_ipo_published
  ON ipo_youtube_summaries (ipo_id, published_at DESC);

-- =============================================================================
-- F) New table: ipo_predictions
-- =============================================================================
CREATE TABLE IF NOT EXISTS ipo_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id INTEGER NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
  model_version TEXT NOT NULL,
  predicted_listing_price NUMERIC(12,2),
  predicted_gain_percent NUMERIC(8,2),
  confidence_lower NUMERIC(8,2),
  confidence_upper NUMERIC(8,2),
  confidence_label TEXT CHECK (confidence_label IN ('low', 'medium', 'high')),
  reasoning TEXT,
  features_used JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ipo_predictions_ipo_generated
  ON ipo_predictions (ipo_id, generated_at DESC);

-- =============================================================================
-- G) New table: scraper_health
-- =============================================================================
CREATE TABLE IF NOT EXISTS scraper_health (
  id BIGSERIAL PRIMARY KEY,
  scraper_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  items_processed INT NOT NULL DEFAULT 0,
  error_message TEXT,
  duration_ms INT,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scraper_health_name_ran
  ON scraper_health (scraper_name, ran_at DESC);

-- =============================================================================
-- H) New table: ml_model_registry
-- =============================================================================
CREATE TABLE IF NOT EXISTS ml_model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT UNIQUE NOT NULL,
  blob_url TEXT,
  feature_schema_url TEXT,
  metrics JSONB,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  trained_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial index so only the active model row is fast-lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_model_registry_active
  ON ml_model_registry (is_active)
  WHERE is_active = TRUE;

-- =============================================================================
-- RLS: enable on all new tables
-- =============================================================================
ALTER TABLE ipo_news               ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_youtube_summaries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_predictions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_health         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_model_registry      ENABLE ROW LEVEL SECURITY;

-- Public SELECT policies (ipo_news, ipo_youtube_summaries, ipo_predictions)
DROP POLICY IF EXISTS "Public can read ipo_news" ON ipo_news;
CREATE POLICY "Public can read ipo_news"
  ON ipo_news FOR SELECT
  TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Public can read ipo_youtube_summaries" ON ipo_youtube_summaries;
CREATE POLICY "Public can read ipo_youtube_summaries"
  ON ipo_youtube_summaries FOR SELECT
  TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Public can read ipo_predictions" ON ipo_predictions;
CREATE POLICY "Public can read ipo_predictions"
  ON ipo_predictions FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- Admin-only SELECT policies for internal tables
-- (service_role bypasses RLS; these policies ensure anon/authenticated cannot read.)
DROP POLICY IF EXISTS "Admin can read scraper_health" ON scraper_health;
CREATE POLICY "Admin can read scraper_health"
  ON scraper_health FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND COALESCE((u.raw_user_meta_data->>'is_admin')::boolean, FALSE) = TRUE
    )
  );

DROP POLICY IF EXISTS "Admin can read ml_model_registry" ON ml_model_registry;
CREATE POLICY "Admin can read ml_model_registry"
  ON ml_model_registry FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND COALESCE((u.raw_user_meta_data->>'is_admin')::boolean, FALSE) = TRUE
    )
  );

-- =============================================================================
-- Column comments for discoverability
-- =============================================================================
COMMENT ON COLUMN ipos.gmp_sources_used          IS 'List of GMP sources used (e.g. investorgain, chittorgarh)';
COMMENT ON COLUMN ipos.subscription_last_scraped IS 'Last time subscription figures were scraped';
COMMENT ON COLUMN ipos.news_last_fetched         IS 'Last time news articles were fetched for this IPO';
COMMENT ON COLUMN ipos.youtube_last_fetched      IS 'Last time YouTube summaries were fetched';
COMMENT ON COLUMN ipos.prediction_last_generated IS 'Last time an ML listing-price prediction was generated';
COMMENT ON COLUMN ipos.anchor_investors          IS 'JSON array of anchor investors with allotment details';

COMMENT ON TABLE ipo_news              IS 'Aggregated news articles per IPO (scraped + dedup by URL)';
COMMENT ON TABLE ipo_youtube_summaries IS 'YouTube video AI-summaries per IPO';
COMMENT ON TABLE ipo_predictions       IS 'Model-generated listing-price predictions per IPO';
COMMENT ON TABLE scraper_health        IS 'Run log for every scraper execution (admin-only)';
COMMENT ON TABLE ml_model_registry     IS 'Registry of trained ML models stored in Vercel Blob (admin-only)';
