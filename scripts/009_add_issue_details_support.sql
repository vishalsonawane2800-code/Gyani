-- =============================================
-- Migration: Add Issue Details Support
-- Ensures ipo_issue_details table has all required fields
-- and adds missing columns if necessary
-- =============================================

-- First, ensure the table exists (from 007_complete_setup.sql)
CREATE TABLE IF NOT EXISTS ipo_issue_details (
  id SERIAL PRIMARY KEY,
  ipo_id INTEGER REFERENCES ipos(id) ON DELETE CASCADE,
  total_issue_size_cr NUMERIC(10, 2),
  fresh_issue_cr NUMERIC(10, 2),
  fresh_issue_percent NUMERIC(6, 2),
  ofs_cr NUMERIC(10, 2),
  ofs_percent NUMERIC(6, 2),
  retail_quota_percent NUMERIC(6, 2),
  nii_quota_percent NUMERIC(6, 2),
  qib_quota_percent NUMERIC(6, 2),
  employee_quota_percent NUMERIC(6, 2),
  shareholder_quota_percent NUMERIC(6, 2),
  ipo_objectives TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ipo_id)
);

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ipo_issue_details' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE ipo_issue_details ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_ipo_issue_details_updated_at ON ipo_issue_details;
CREATE TRIGGER update_ipo_issue_details_updated_at
BEFORE UPDATE ON ipo_issue_details
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ensure RLS is enabled
ALTER TABLE ipo_issue_details ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to avoid conflicts
DROP POLICY IF EXISTS "Public read access" ON ipo_issue_details;
DROP POLICY IF EXISTS "Service role full access" ON ipo_issue_details;

CREATE POLICY "Public read access" ON ipo_issue_details FOR SELECT USING (true);
CREATE POLICY "Service role full access" ON ipo_issue_details FOR ALL USING (true) WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ipo_issue_details_ipo_id ON ipo_issue_details(ipo_id);

-- =============================================
-- Verification query
-- =============================================
SELECT 'Issue details table ready!' as status;
