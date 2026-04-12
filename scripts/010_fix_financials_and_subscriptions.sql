-- =============================================
-- Fix Financials Table and Add Subscription Support
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Add unique constraint for ipo_financials upsert operations
-- This allows proper upsert based on ipo_id + fiscal_year
DO $$ BEGIN
    ALTER TABLE ipo_financials 
    ADD CONSTRAINT ipo_financials_ipo_fiscal_unique 
    UNIQUE (ipo_id, fiscal_year);
EXCEPTION
    WHEN duplicate_table THEN null;
    WHEN duplicate_object THEN null;
END $$;

-- 2. Ensure subscription_history table has all needed columns
-- The table should already exist from 007_complete_setup.sql

-- Add sNII (small NII) and bNII (big NII) columns if they don't exist
ALTER TABLE subscription_history 
ADD COLUMN IF NOT EXISTS snii NUMERIC(10, 2) DEFAULT 0;

ALTER TABLE subscription_history 
ADD COLUMN IF NOT EXISTS bnii NUMERIC(10, 2) DEFAULT 0;

-- Add employee subscription column
ALTER TABLE subscription_history 
ADD COLUMN IF NOT EXISTS employee NUMERIC(10, 2) DEFAULT 0;

-- Add day number column
ALTER TABLE subscription_history 
ADD COLUMN IF NOT EXISTS day_number INTEGER DEFAULT 1;

-- Add is_final column to mark final subscription status
ALTER TABLE subscription_history 
ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT FALSE;

-- Add source column to track data source
ALTER TABLE subscription_history 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- 3. Create unique constraint for subscription upsert
DO $$ BEGIN
    ALTER TABLE subscription_history 
    ADD CONSTRAINT subscription_history_ipo_date_time_unique 
    UNIQUE (ipo_id, date, time);
EXCEPTION
    WHEN duplicate_table THEN null;
    WHEN duplicate_object THEN null;
END $$;

-- 4. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_subscription_history_ipo_date 
ON subscription_history(ipo_id, date DESC);

-- 5. Ensure RLS policies exist
DROP POLICY IF EXISTS "Public read access" ON subscription_history;
DROP POLICY IF EXISTS "Service role full access" ON subscription_history;

CREATE POLICY "Public read access" ON subscription_history FOR SELECT USING (true);
CREATE POLICY "Service role full access" ON subscription_history FOR ALL USING (true) WITH CHECK (true);

-- 6. Add net_worth column to ipo_financials if missing
ALTER TABLE ipo_financials 
ADD COLUMN IF NOT EXISTS net_worth NUMERIC(15, 2);

-- 7. Verify ipo_financials structure
-- Check if all columns exist and add missing ones
ALTER TABLE ipo_financials 
ADD COLUMN IF NOT EXISTS profit NUMERIC(15, 2);

-- Done!
SELECT 'Financials and subscription tables fixed!' as status;
