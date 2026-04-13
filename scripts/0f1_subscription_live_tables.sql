-- Migration: Add subscription_live and subscription_history tables
-- Date: 2026-04-13
-- Description: Add support for live and historical IPO subscription data

-- Table: subscription_live
-- Live/current subscription status by category (like Chittorgarh format)
CREATE TABLE IF NOT EXISTS subscription_live (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('anchor', 'qib', 'nii', 'bnii', 'snii', 'retail', 'employee', 'total')),
  
  -- Subscription data
  subscription_times NUMERIC(10, 2) DEFAULT 0, -- Subscription times (e.g., 1.52x)
  shares_offered BIGINT DEFAULT 0, -- Total shares offered
  shares_bid_for BIGINT DEFAULT 0, -- Shares bid for
  total_amount_cr NUMERIC(12, 2) DEFAULT 0, -- Total amount in Crores
  
  -- Display and tracking
  display_order INT DEFAULT 0, -- Order for display in table
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one entry per category per IPO
  UNIQUE(ipo_id, category)
);

CREATE INDEX IF NOT EXISTS idx_subscription_live_ipo_id ON subscription_live(ipo_id);
CREATE INDEX IF NOT EXISTS idx_subscription_live_category ON subscription_live(category);

-- Table: subscription_history
-- Day-wise historical subscription data for IPOs
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
  
  -- Date and time
  date DATE NOT NULL,
  time TEXT DEFAULT '17:00', -- Time of snapshot (e.g., "17:00")
  day_number INT DEFAULT 1, -- Day 1, 2, or 3
  
  -- Subscription data by category
  anchor NUMERIC DEFAULT 0, -- Anchor subscription times
  qib NUMERIC DEFAULT 0, -- QIB (Ex Anchor) subscription times
  nii NUMERIC DEFAULT 0, -- NII subscription times
  bnii NUMERIC DEFAULT 0, -- bNII (> Rs 10L) subscription times
  snii NUMERIC DEFAULT 0, -- sNII (< Rs 10L) subscription times
  retail NUMERIC DEFAULT 0, -- Retail subscription times
  employee NUMERIC DEFAULT 0, -- Employee subscription times
  total NUMERIC DEFAULT 0, -- Total subscription times
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one entry per IPO per date per time
  UNIQUE(ipo_id, date, time)
);

CREATE INDEX IF NOT EXISTS idx_subscription_history_ipo_id ON subscription_history(ipo_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_date ON subscription_history(date);
CREATE INDEX IF NOT EXISTS idx_subscription_history_day_number ON subscription_history(day_number);

-- Enable RLS (Row Level Security) if needed
ALTER TABLE subscription_live ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY IF NOT EXISTS "subscription_live_public_read" ON subscription_live
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "subscription_history_public_read" ON subscription_history
  FOR SELECT USING (true);

-- Admin insert/update policies
CREATE POLICY IF NOT EXISTS "subscription_live_admin_insert" ON subscription_live
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "subscription_live_admin_update" ON subscription_live
  FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "subscription_history_admin_insert" ON subscription_history
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "subscription_history_admin_update" ON subscription_history
  FOR UPDATE USING (true);
