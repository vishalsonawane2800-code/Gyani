-- =============================================================================
-- 018_force_reset_admin_and_debug.sql
-- -----------------------------------------------------------------------------
-- Purpose
--   Diagnose why admin login still returns "Invalid credentials" in production
--   and forcibly reset the admin credentials to a known-good value.
--
--   Unlike 017, this script runs as a sequence of plain statements (no DO
--   block) so that if any single line errors the SQL editor will show you
--   exactly which one. It is also fully idempotent.
--
-- What it does
--   1. Ensures the pgcrypto-like requirements are not a blocker (hash is
--      precomputed on the v0 side, so no extensions needed).
--   2. Ensures the admins table exists with the columns we depend on.
--   3. Prints the current admin row BEFORE we touch it (prefix of the
--      password_hash only, never the full value).
--   4. Upserts the admin user with a known bcrypt hash of "Admin@Gyani2026".
--   5. Prints the current admin row AFTER the update.
--
-- Credentials after running
--   username: admin
--   password: Admin@Gyani2026
--
-- How to run
--   Paste this whole file into the Supabase SQL editor (the one attached to
--   the project your PRODUCTION deployment uses) and click "Run". Look at
--   the "BEFORE" and "AFTER" result panes: the AFTER hash_prefix MUST be
--   "$2b$10$QPnbTfAywnNpv".
-- =============================================================================

-- 1) Ensure required extension for gen_random_uuid() (safe if already on)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Ensure table exists (safe if already created)
CREATE TABLE IF NOT EXISTS public.admins (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username              TEXT NOT NULL UNIQUE,
  password_hash         TEXT NOT NULL,
  must_reset_password   BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3) Show what's stored right now (BEFORE the update).
--    We only show the first 20 chars of the hash so nothing sensitive leaks,
--    but that's enough for us to verify which seed is currently in place.
SELECT
  'BEFORE'                       AS phase,
  id,
  username,
  LEFT(password_hash, 20)        AS hash_prefix,
  must_reset_password,
  created_at,
  updated_at
FROM public.admins
WHERE username = 'admin';

-- 4) Forcibly reset the admin credentials. The hash below is bcrypt for
--    the literal string "Admin@Gyani2026" (cost 10). Do not modify it.
INSERT INTO public.admins (username, password_hash, must_reset_password)
VALUES (
  'admin',
  '$2b$10$QPnbTfAywnNpvK5Rd0N2guDx/IJGAeT.1aD9f5N8r4F/eAi8ZQzc6',
  false
)
ON CONFLICT (username) DO UPDATE
SET
  password_hash       = EXCLUDED.password_hash,
  must_reset_password = EXCLUDED.must_reset_password,
  updated_at          = NOW();

-- 5) Show what's stored now (AFTER the update). The hash_prefix column
--    MUST read exactly:  $2b$10$QPnbTfAywnNpv
--    If it doesn't, an older seed script ran after this one and overwrote
--    the row — re-run this file as the LAST thing you execute.
SELECT
  'AFTER'                        AS phase,
  id,
  username,
  LEFT(password_hash, 20)        AS hash_prefix,
  must_reset_password,
  created_at,
  updated_at
FROM public.admins
WHERE username = 'admin';
