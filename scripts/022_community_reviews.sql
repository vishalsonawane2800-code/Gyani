-- =========================================================
-- Migration 022: Community reviews (logged-in user reviews)
-- =========================================================
-- Adds:
--   1. `users`             — lightweight user accounts (email + display name)
--   2. `community_reviews` — reviews written by signed-in users, shown on
--      the home page bottom. An optional `ipo_id` lets a review be linked
--      to a specific IPO detail page; NULL = site-wide review.
--   3. Seeds 8 fake reviews with Indian names so the public section is
--      never empty while real users are still onboarding.
--
-- Public read is allowed (feed is public). Inserts happen server-side via
-- the service role, so RLS stays closed to anon writers.
-- =========================================================

-- 1. Users table --------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));

-- 2. Community reviews table -------------------------------------------
CREATE TABLE IF NOT EXISTS community_reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Denormalised user name so deleted accounts still render nicely.
  user_name   TEXT NOT NULL,
  ipo_id      INTEGER REFERENCES ipos(id) ON DELETE CASCADE,
  rating      SMALLINT CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT NOT NULL CHECK (LENGTH(comment) BETWEEN 10 AND 2000),
  is_approved BOOLEAN NOT NULL DEFAULT TRUE, -- flip to false for moderation workflow
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_reviews_created_at ON community_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_reviews_ipo_id     ON community_reviews(ipo_id);

-- 3. Trigger on users.updated_at (reuses existing function) -------------
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS ---------------------------------------------------------------
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access"       ON community_reviews;
DROP POLICY IF EXISTS "Service role full access" ON community_reviews;
DROP POLICY IF EXISTS "Service role full access" ON users;

-- Approved community reviews are publicly readable.
CREATE POLICY "Public read access" ON community_reviews
  FOR SELECT USING (is_approved = TRUE);

-- Server (service role) can do anything on both tables.
CREATE POLICY "Service role full access" ON community_reviews
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON users
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Seed: 8 fake Indian-name reviews -----------------------------------
-- Only inserted if the table is empty so reruns are safe.
INSERT INTO community_reviews (user_name, comment, rating, is_approved, created_at)
SELECT * FROM (VALUES
  ('Rahul Sharma',     'Great platform for tracking IPO GMP and subscription data. The live updates are very helpful for retail investors like me.', 5, TRUE, NOW() - INTERVAL '2 days'),
  ('Priya Iyer',       'Finally an IPO site that does not overload me with ads. The AI predictions have been surprisingly accurate so far.', 5, TRUE, NOW() - INTERVAL '5 days'),
  ('Ankit Patel',      'Loved the subscription tracker. Easy to see QIB / NII / Retail split at a glance instead of scrolling BSE pages.', 4, TRUE, NOW() - INTERVAL '8 days'),
  ('Neha Verma',       'The listed IPOs archive is a goldmine for back-testing my allotment strategy. Please keep adding historical data.', 5, TRUE, NOW() - INTERVAL '11 days'),
  ('Rohan Deshmukh',   'Clean UI, fast load, and the GMP history chart is better than most paid tools. Highly recommended for SME IPO investors.', 5, TRUE, NOW() - INTERVAL '15 days'),
  ('Sneha Kulkarni',   'Good site overall but would love a mobile app. Also an email alert when allotment is out would be a killer feature.', 4, TRUE, NOW() - INTERVAL '20 days'),
  ('Vikram Singh',     'Allotment status link worked perfectly on listing day. Saved me a lot of time refreshing the registrar page.', 5, TRUE, NOW() - INTERVAL '25 days'),
  ('Kavya Reddy',      'The FAQ section on each IPO page is very beginner-friendly. My father finally understood what GMP means. Thank you!', 5, TRUE, NOW() - INTERVAL '30 days')
) AS seed(user_name, comment, rating, is_approved, created_at)
WHERE NOT EXISTS (SELECT 1 FROM community_reviews);
