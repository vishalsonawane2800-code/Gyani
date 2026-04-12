-- =============================================
-- Migration: Add KPI (Key Performance Indicator) Table
-- For storing ROE, ROCE, EPS, P/E, Promoter Holding etc.
-- =============================================

-- Create KPI table
CREATE TABLE IF NOT EXISTS ipo_kpi (
  id SERIAL PRIMARY KEY,
  ipo_id INTEGER REFERENCES ipos(id) ON DELETE CASCADE,
  kpi_type VARCHAR(20) NOT NULL CHECK (kpi_type IN ('dated', 'pre_post')), -- dated = has date columns, pre_post = pre/post IPO
  metric VARCHAR(50) NOT NULL, -- roe, roce, debt_equity, ronw, pat_margin, ebitda_margin, price_to_book, eps, pe, promoter_holding, market_cap, promoters, disclaimer
  date_label VARCHAR(50), -- e.g., "Dec 31, 2025" or "pre" or "post"
  value DECIMAL(15, 2), -- numeric value
  text_value TEXT, -- for text fields like promoters, disclaimer
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_ipo_kpi_ipo_id ON ipo_kpi(ipo_id);
CREATE INDEX IF NOT EXISTS idx_ipo_kpi_metric ON ipo_kpi(metric);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_ipo_kpi_updated_at ON ipo_kpi;
CREATE TRIGGER update_ipo_kpi_updated_at
BEFORE UPDATE ON ipo_kpi
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS for ipo_kpi
ALTER TABLE ipo_kpi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access" ON ipo_kpi;
DROP POLICY IF EXISTS "Service role full access" ON ipo_kpi;
CREATE POLICY "Public read access" ON ipo_kpi FOR SELECT USING (true);
CREATE POLICY "Service role full access" ON ipo_kpi FOR ALL USING (true) WITH CHECK (true);

-- Example: How to insert KPI data
-- Dated KPIs (ROE, ROCE, etc. with date columns):
-- INSERT INTO ipo_kpi (ipo_id, kpi_type, metric, date_label, value) VALUES 
--   (1, 'dated', 'roe', 'Dec 31, 2025', 24.28),
--   (1, 'dated', 'roe', 'Mar 31, 2025', 35.83),
--   (1, 'dated', 'roce', 'Dec 31, 2025', 26.53),
--   (1, 'dated', 'roce', 'Mar 31, 2025', 41.76);

-- Pre/Post IPO KPIs:
-- INSERT INTO ipo_kpi (ipo_id, kpi_type, metric, date_label, value) VALUES 
--   (1, 'pre_post', 'eps', 'pre', 8.28),
--   (1, 'pre_post', 'eps', 'post', 9.10),
--   (1, 'pre_post', 'pe', 'pre', 21.13),
--   (1, 'pre_post', 'pe', 'post', 19.23),
--   (1, 'pre_post', 'promoter_holding', 'pre', 92.26),
--   (1, 'pre_post', 'promoter_holding', 'post', 68.92),
--   (1, 'pre_post', 'market_cap', NULL, 599.29);

-- Text fields:
-- INSERT INTO ipo_kpi (ipo_id, kpi_type, metric, text_value) VALUES 
--   (1, 'pre_post', 'promoters', 'Kalpesh Dhanjibhai Patel, Kanubhai Patel and Vasantkumar Narayanbhai Patel are the company''s promoters.'),
--   (1, 'pre_post', 'disclaimer', 'The financial data is based on the company''s DRHP and is subject to change.');
