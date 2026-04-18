-- 015_add_listing_day_fields.sql
-- Adds listing-day close and intraday change columns.
-- `listing_price` (already exists) = list price at open on listing day.
-- `list_day_close`                  = close price on listing day.
-- `list_day_change_pct`             = % change between listing_price and list_day_close.
-- These are used by the admin "Listing Day Data" section and by the
-- day-after-listing auto-migration into listed_ipos.

ALTER TABLE ipos
  ADD COLUMN IF NOT EXISTS list_day_close      NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS list_day_change_pct NUMERIC(6, 2);

COMMENT ON COLUMN ipos.list_day_close      IS 'Closing price on listing day (NSE/BSE).';
COMMENT ON COLUMN ipos.list_day_change_pct IS 'Percent change from listing_price to list_day_close.';
