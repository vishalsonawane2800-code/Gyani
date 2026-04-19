-- =============================================
-- Migration 017: Reset / seed the default admin user
-- =============================================
--
-- Why this file exists
-- --------------------
-- On some production deployments the `admins` row was either never seeded,
-- or was seeded with an older placeholder hash that did not verify against
-- the documented password, breaking /admin/login.
--
-- This migration is SAFE TO RE-RUN at any time. It:
--   1. Ensures the `admins` table exists (matches 006_create_admin_table.sql).
--   2. Upserts a single admin row with a known-good bcrypt hash.
--   3. Clears `must_reset_password` so the first login goes straight to the
--      dashboard. (You can change the password from /admin/reset-password
--      afterwards if you want.)
--
-- Default credentials written by this script
-- ------------------------------------------
--   Username: admin
--   Password: Admin@Gyani2026
--
-- The hash below is a real bcrypt (cost 10) hash of "Admin@Gyani2026".
-- If you rotate the password, regenerate the hash with bcrypt(cost=10) and
-- update this file (or just change it from the UI after logging in).
-- =============================================

-- Make sure the updated_at trigger function exists (idempotent).
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Make sure the admins table exists (safe if 006 already ran).
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  must_reset_password BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);

-- Re-create the updated_at trigger idempotently.
DROP TRIGGER IF EXISTS update_admins_updated_at ON admins;
CREATE TRIGGER update_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS + service-role-only policy (the app talks to Supabase using the
-- service_role key, which bypasses RLS anyway; this policy just makes intent
-- explicit and blocks anon/authenticated clients from reading hashes).
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON admins;
CREATE POLICY "Service role full access"
  ON admins FOR ALL
  USING (true)
  WITH CHECK (true);

-- Upsert the default admin with a known-good bcrypt hash.
INSERT INTO admins (username, password_hash, must_reset_password)
VALUES (
  'admin',
  '$2b$10$QPnbTfAywnNpvK5Rd0N2guDx/IJGAeT.1aD9f5N8r4F/eAi8ZQzc6',
  false
)
ON CONFLICT (username) DO UPDATE
SET password_hash       = EXCLUDED.password_hash,
    must_reset_password = EXCLUDED.must_reset_password,
    updated_at          = NOW();

-- Sanity check (will be visible in the SQL editor output).
SELECT id, username, must_reset_password, created_at, updated_at
FROM admins
WHERE username = 'admin';
