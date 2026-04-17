-- Migration: Add automation columns to ipos table
-- Description: Extends the ipos table to support automated data pipelines and audit logging
-- Date: 2025-01-XX

-- Add automation-related columns to the ipos table
ALTER TABLE ipos
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS enrichment_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS auto_updated BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN ipos.data_source IS 'Source of the IPO data: manual, api, scraper, or enrichment';
COMMENT ON COLUMN ipos.last_enriched_at IS 'Timestamp of the last automated enrichment';
COMMENT ON COLUMN ipos.enrichment_version IS 'Version number of the enrichment schema applied';
COMMENT ON COLUMN ipos.auto_updated IS 'Flag indicating if the record was automatically updated';

-- Create index for efficient querying of automation-related data
CREATE INDEX IF NOT EXISTS idx_ipos_data_source ON ipos(data_source);
CREATE INDEX IF NOT EXISTS idx_ipos_last_enriched_at ON ipos(last_enriched_at);
CREATE INDEX IF NOT EXISTS idx_ipos_auto_updated ON ipos(auto_updated) WHERE auto_updated = TRUE;
