-- Create subscription_live table for live subscription status (Chittorgarh format)
CREATE TABLE IF NOT EXISTS subscription_live (
  id SERIAL PRIMARY KEY,
  ipo_id INTEGER NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('anchor', 'qib', 'nii', 'bnii', 'snii', 'retail', 'employee', 'total')),
  subscription_times NUMERIC(10,2) DEFAULT 0,
  shares_offered BIGINT DEFAULT 0,
  shares_bid_for BIGINT DEFAULT 0,
  total_amount_cr NUMERIC(12,2) DEFAULT 0,
  display_order INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ipo_id, category)
);

-- Create subscription_history table for day-wise historical data
CREATE TABLE IF NOT EXISTS subscription_history (
  id SERIAL PRIMARY KEY,
  ipo_id INTEGER NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TEXT DEFAULT '17:00',
  day_number INT DEFAULT 1,
  anchor NUMERIC DEFAULT 0,
  retail NUMERIC DEFAULT 0,
  nii NUMERIC DEFAULT 0,
  snii NUMERIC DEFAULT 0,
  bnii NUMERIC DEFAULT 0,
  qib NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  employee NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ipo_id, date, time)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_subscription_live_ipo_id ON subscription_live(ipo_id);
CREATE INDEX IF NOT EXISTS idx_subscription_live_category ON subscription_live(category);
CREATE INDEX IF NOT EXISTS idx_subscription_history_ipo_id ON subscription_history(ipo_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_date ON subscription_history(date);

-- Add column to ipos table to track last subscription update
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS subscription_last_updated TIMESTAMPTZ;

-- Enable RLS if needed
ALTER TABLE subscription_live ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safer approach)
DROP POLICY IF EXISTS "subscription_live_public_read" ON subscription_live;
DROP POLICY IF EXISTS "subscription_history_public_read" ON subscription_history;

-- Public read access
CREATE POLICY "subscription_live_public_read" ON subscription_live
  FOR SELECT USING (true);

CREATE POLICY "subscription_history_public_read" ON subscription_history
  FOR SELECT USING (true);
