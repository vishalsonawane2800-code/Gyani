-- Add logo_url column to ipos table
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add logo_url column to listed_ipos table as well
ALTER TABLE listed_ipos ADD COLUMN IF NOT EXISTS logo_url TEXT;
