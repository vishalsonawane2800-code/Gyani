-- =============================================
-- Subscription Live & Day-wise Tables
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Create subscription_live table for live/current subscription status
-- This stores the detailed breakdown by category (similar to Chittorgarh format)
CREATE TABLE IF NOT EXISTS subscription_live (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ipo_id UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'anchor', 'qib', 'nii', 'bnii', 'snii', 'retail', 'total'
  subscription_times NUMERIC(10, 2) DEFAULT 0, -- e.g., 1.52x
  shares_offered BIGINT DEFAULT 0, -- e.g., 2572270
  shares_bid_for BIGINT DEFAULT 0, -- e.g., 2572270
  total_amount_cr NUMERIC(12, 2) DEFAULT 0, -- e.g., 45.015 Cr
  display_order INT DEFAULT 0, -- For ordering in display
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ipo_id, category)
);

-- 2. Add additional columns to subscription_history for day-wise tracking
-- Already has retail, nii, qib, snii, bnii, total from previous migration
-- Adding anchor and employee columns if not exist
ALTER TABLE subscription_history 
ADD COLUMN IF NOT EXISTS anchor NUMERIC(10, 2) DEFAULT 0;

-- 3. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_subscription_live_ipo 
ON subscription_live(ipo_id);

CREATE INDEX IF NOT EXISTS idx_subscription_live_category 
ON subscription_live(ipo_id, category);

-- 4. Enable RLS
ALTER TABLE subscription_live ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
DROP POLICY IF EXISTS "Public read access" ON subscription_live;
DROP POLICY IF EXISTS "Service role full access" ON subscription_live;

CREATE POLICY "Public read access" ON subscription_live FOR SELECT USING (true);
CREATE POLICY "Service role full access" ON subscription_live FOR ALL USING (true) WITH CHECK (true);

-- 6. Create function to upsert subscription live data
CREATE OR REPLACE FUNCTION upsert_subscription_live(
  p_ipo_id UUID,
  p_category TEXT,
  p_subscription_times NUMERIC,
  p_shares_offered BIGINT,
  p_shares_bid_for BIGINT,
  p_total_amount_cr NUMERIC
) RETURNS void AS $$
BEGIN
  INSERT INTO subscription_live (
    ipo_id, category, subscription_times, shares_offered, shares_bid_for, total_amount_cr, display_order, updated_at
  ) VALUES (
    p_ipo_id, 
    p_category, 
    p_subscription_times, 
    p_shares_offered, 
    p_shares_bid_for, 
    p_total_amount_cr,
    CASE p_category
      WHEN 'anchor' THEN 1
      WHEN 'qib' THEN 2
      WHEN 'nii' THEN 3
      WHEN 'bnii' THEN 4
      WHEN 'snii' THEN 5
      WHEN 'retail' THEN 6
      WHEN 'employee' THEN 7
      WHEN 'total' THEN 8
      ELSE 9
    END,
    NOW()
  )
  ON CONFLICT (ipo_id, category) 
  DO UPDATE SET
    subscription_times = p_subscription_times,
    shares_offered = p_shares_offered,
    shares_bid_for = p_shares_bid_for,
    total_amount_cr = p_total_amount_cr,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 7. Example: Insert sample subscription data for testing
-- Uncomment and modify for your IPO
/*
-- Get IPO ID first
-- SELECT id FROM ipos WHERE slug = 'om-power-transmission-ipo';

-- Then insert subscription data
INSERT INTO subscription_live (ipo_id, category, subscription_times, shares_offered, shares_bid_for, total_amount_cr, display_order)
VALUES 
  ('your-ipo-uuid', 'anchor', 1.00, 2572270, 2572270, 45.015, 1),
  ('your-ipo-uuid', 'qib', 1.52, 1715230, 2600235, 45.504, 2),
  ('your-ipo-uuid', 'nii', 2.35, 1286250, 3017670, 52.809, 3),
  ('your-ipo-uuid', 'bnii', 2.69, 857500, 2306220, 40.359, 4),
  ('your-ipo-uuid', 'snii', 1.66, 428750, 711450, 12.450, 5),
  ('your-ipo-uuid', 'retail', 1.04, 3001250, 3135565, 54.872, 6),
  ('your-ipo-uuid', 'total', 1.46, 6002730, 8753470, 153.186, 8)
ON CONFLICT (ipo_id, category) DO UPDATE SET
  subscription_times = EXCLUDED.subscription_times,
  shares_offered = EXCLUDED.shares_offered,
  shares_bid_for = EXCLUDED.shares_bid_for,
  total_amount_cr = EXCLUDED.total_amount_cr,
  updated_at = NOW();
*/

-- Done!
SELECT 'Subscription live tables created!' as status;
