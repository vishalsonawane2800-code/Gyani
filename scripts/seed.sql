-- Sample seed data for your Supabase
-- Run this after schema.sql

INSERT INTO ipos (name, slug, status, price_band, lot_size, issue_size, exchange, open_date, close_date) VALUES
('Emiac Technologies', 'emiac-technologies-ipo', 'open', '93-98', 1200, '31.75 Cr', 'BSE SME', '2026-03-27', '2026-04-08'),
('Highness Microelectronics', 'highness-microelectronics-ipo', 'upcoming', '114-120', 1200, '21.67 Cr', 'BSE SME', '2026-03-31', '2026-04-03'),
('Powerica Limited', 'powerica-limited-ipo', 'open', '375-395', 37, '1100 Cr', 'Mainboard', '2026-03-24', '2026-03-27'),
('Fractal Analytics', 'fractal-analytics-ipo', 'upcoming', '540-565', 26, '2400 Cr', 'Mainboard', '2026-04-14', '2026-04-17');

-- Add GMP history
INSERT INTO gmp_history (ipo_id, gmp, recorded_at)
SELECT id, 5, NOW() - INTERVAL '2 days' FROM ipos WHERE slug = 'emiac-technologies-ipo'
UNION ALL
SELECT id, 8, NOW() - INTERVAL '1 day' FROM ipos WHERE slug = 'emiac-technologies-ipo'
UNION ALL
SELECT id, 10, NOW() FROM ipos WHERE slug = 'emiac-technologies-ipo'
UNION ALL
SELECT id, 15, NOW() FROM ipos WHERE slug = 'highness-microelectronics-ipo'
UNION ALL
SELECT id, 12, NOW() FROM ipos WHERE slug = 'powerica-limited-ipo'
UNION ALL
SELECT id, 35, NOW() FROM ipos WHERE slug = 'fractal-analytics-ipo';
