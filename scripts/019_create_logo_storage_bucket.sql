-- =========================================================================
-- 019_create_logo_storage_bucket.sql
-- Creates the `ipo-logos` Supabase Storage bucket used by the admin
-- upload-logo API route. Idempotent: safe to re-run.
--
-- Run this in your production Supabase SQL editor once. It ALSO needs to
-- exist in any dev/staging project you deploy to.
-- =========================================================================

-- 1) Create a public bucket. Public = files are readable by anyone with the
--    URL. Writes are still gated behind the service role key / RLS policies.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ipo-logos',
  'ipo-logos',
  true,
  2 * 1024 * 1024, -- 2MB, matches the server-side validation
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) RLS policies.
--    The upload route uses the SERVICE ROLE key (bypasses RLS), so we don't
--    strictly need an insert policy for anon, but we DO want public reads so
--    the logos can render on the site without auth.
DO $$
BEGIN
  -- Public read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'ipo_logos_public_read'
  ) THEN
    CREATE POLICY "ipo_logos_public_read"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'ipo-logos');
  END IF;
END$$;

SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id = 'ipo-logos';
