-- Reset bogus subscription values written by the pre-fix Chittorgarh
-- scraper (which was matching "Total Issue Size" etc. on non-subscription
-- tables). The new parser will re-populate these the next cron tick
-- with either real data or NULLs.
--
-- Safe to run multiple times.

UPDATE ipos
SET
  subscription_total = NULL,
  subscription_retail = NULL,
  subscription_nii = NULL,
  subscription_qib = NULL,
  subscription_source = NULL,
  subscription_last_scraped = NULL
WHERE status IN ('open', 'lastday', 'closed');

-- Clear any day-wise rows inserted by the bad parser.
DELETE FROM subscription_history
WHERE ipo_id IN (
  SELECT id FROM ipos WHERE status IN ('open', 'lastday', 'closed')
);

-- Clear cached scraper snapshots if the table exists (Redis handles
-- the runtime cache; this is for the DB-backed fallback if any).
