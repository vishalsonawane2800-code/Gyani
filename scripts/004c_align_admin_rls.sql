-- Migration 004c: Align admin-only RLS policies with this project's auth pattern.
--
-- Context
-- -------
-- This app does NOT use Supabase Auth (auth.users) and does NOT have a
-- `profiles.role = 'admin'` table. Admin access is implemented via a custom
-- `admins` table (see scripts/006_create_admin_table.sql) + a JWT signed with
-- JWT_SECRET, verified in middleware.ts for /api/admin/* and /api/cron/* routes.
--
-- Server-side code talks to Postgres with the service_role key, which bypasses
-- RLS. Therefore the correct policy for scraper_health and ml_model_registry is
-- "no anon / authenticated access at all" — only service_role reads/writes.
--
-- Migration 004_automation_extensions.sql added SELECT policies that reference
-- `auth.users.raw_user_meta_data->>'is_admin'`. Those policies are dead code in
-- this project (auth.uid() is always NULL from our API layer) and are
-- misleading because they suggest a Supabase Auth flow that doesn't exist here.
-- This migration drops them so the tables are effectively service-role-only,
-- which matches how the rest of the admin surface is secured.

-- -------------------------------------------------------------------
-- Drop the misaligned policies (safe if they don't exist)
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin can read scraper_health"    ON scraper_health;
DROP POLICY IF EXISTS "Admin can read ml_model_registry" ON ml_model_registry;

-- -------------------------------------------------------------------
-- Keep RLS enabled with no policies for anon / authenticated.
-- service_role bypasses RLS, so backend code continues to work.
-- anon / authenticated clients get zero rows, which is the desired behavior.
-- -------------------------------------------------------------------
ALTER TABLE scraper_health    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_model_registry ENABLE ROW LEVEL SECURITY;

-- Optional hardening: explicit deny-by-default policies for clarity.
-- (Not strictly required — absence of a policy already denies — but this
-- makes intent visible in the schema.)
DROP POLICY IF EXISTS "Deny anon scraper_health"           ON scraper_health;
CREATE POLICY "Deny anon scraper_health"
  ON scraper_health FOR SELECT
  TO anon, authenticated
  USING (FALSE);

DROP POLICY IF EXISTS "Deny anon ml_model_registry"        ON ml_model_registry;
CREATE POLICY "Deny anon ml_model_registry"
  ON ml_model_registry FOR SELECT
  TO anon, authenticated
  USING (FALSE);

COMMENT ON TABLE scraper_health    IS 'Run log for every scraper execution. Service-role only; admin UI reads via authenticated /api/admin routes (JWT in middleware.ts).';
COMMENT ON TABLE ml_model_registry IS 'Registry of trained ML models stored in Vercel Blob. Service-role only; admin UI reads via authenticated /api/admin routes (JWT in middleware.ts).';
