-- ============================================================
-- DEVICE CATALOG: Add sort_order column and populate missing models
-- ============================================================
-- Purpose:
-- 1. Add sort_order column for custom ordering
-- 2. For Apple: newest-to-oldest (iPhone 16 first, iPhone 6 last)
-- 3. For other brands: alphabetical order by model name
-- ============================================================

-- Step 1: Add sort_order column if not exists
ALTER TABLE device_catalog ADD COLUMN IF NOT EXISTS sort_order integer;

-- Step 2: Insert missing Apple iPhone models (if not already present)
-- Using ON CONFLICT to avoid duplicates
INSERT INTO device_catalog (brand, model, device_type) VALUES
-- iPhone 16 series (newest)
('Apple', 'iPhone 16e', 'HANDY'),
-- iPhone SE series (newest)
('Apple', 'iPhone SE (3. Gen)', 'HANDY')
ON CONFLICT DO NOTHING;

-- Step 3: Insert missing Samsung models (S25 series, Z Fold 6, Z Flip 6)
INSERT INTO device_catalog (brand, model, device_type) VALUES
-- Galaxy S25 series
('Samsung', 'Galaxy S25', 'HANDY'),
('Samsung', 'Galaxy S25+', 'HANDY'),
('Samsung', 'Galaxy S25 Ultra', 'HANDY'),
-- Galaxy Z Fold 6
('Samsung', 'Galaxy Z Fold 6', 'HANDY'),
-- Galaxy Z Flip 6
('Samsung', 'Galaxy Z Flip 6', 'HANDY'),
-- Galaxy A series (newer models)
('Samsung', 'Galaxy A15', 'HANDY'),
('Samsung', 'Galaxy A16', 'HANDY'),
('Samsung', 'Galaxy A25', 'HANDY'),
('Samsung', 'Galaxy A35 5G', 'HANDY'),
('Samsung', 'Galaxy A56 5G', 'HANDY')
ON CONFLICT DO NOTHING;

-- Step 4: Insert missing Xiaomi models
INSERT INTO device_catalog (brand, model, device_type) VALUES
('Xiaomi', '14', 'HANDY'),
('Xiaomi', '14 Pro', 'HANDY'),
('Xiaomi', '14 Ultra', 'HANDY'),
('Xiaomi', '13', 'HANDY'),
('Xiaomi', '13 Pro', 'HANDY'),
('Xiaomi', '13 Ultra', 'HANDY'),
('Xiaomi', 'Redmi Note 13', 'HANDY'),
('Xiaomi', 'Redmi Note 13 Pro', 'HANDY'),
('Xiaomi', 'Redmi Note 13 Pro+', 'HANDY'),
('Xiaomi', 'Redmi Note 14', 'HANDY'),
('Xiaomi', 'Redmi Note 14 Pro', 'HANDY'),
('Xiaomi', 'Redmi Note 14 Pro+', 'HANDY'),
('Xiaomi', 'POCO F6', 'HANDY'),
('Xiaomi', 'POCO F6 Pro', 'HANDY'),
('Xiaomi', 'POCO X6', 'HANDY'),
('Xiaomi', 'POCO X6 Pro', 'HANDY')
ON CONFLICT DO NOTHING;

-- Step 5: Insert missing Sony models
INSERT INTO device_catalog (brand, model, device_type) VALUES
('Sony', 'Xperia 1 V', 'HANDY'),
('Sony', 'Xperia 1 VI', 'HANDY'),
('Sony', 'Xperia 5 V', 'HANDY'),
('Sony', 'Xperia 10 V', 'HANDY'),
('Sony', 'Xperia 10 VI', 'HANDY')
ON CONFLICT DO NOTHING;

-- Step 6: Insert missing Motorola models
INSERT INTO device_catalog (brand, model, device_type) VALUES
('Motorola', 'Edge 50', 'HANDY'),
('Motorola', 'Edge 50 Pro', 'HANDY'),
('Motorola', 'Edge 50 Ultra', 'HANDY'),
('Motorola', 'Edge 50 Neo', 'HANDY'),
('Motorola', 'Razr 50', 'HANDY'),
('Motorola', 'Razr 50 Ultra', 'HANDY'),
('Motorola', 'Moto G84', 'HANDY'),
('Motorola', 'Moto G85', 'HANDY'),
('Motorola', 'Moto G Power 5G', 'HANDY'),
('Motorola', 'ThinkPhone', 'HANDY')
ON CONFLICT DO NOTHING;

-- Step 7: Insert missing Huawei models
INSERT INTO device_catalog (brand, model, device_type) VALUES
('Huawei', 'Pura 70', 'HANDY'),
('Huawei', 'Pura 70 Pro', 'HANDY'),
('Huawei', 'Pura 70 Ultra', 'HANDY'),
('Huawei', 'Mate 60', 'HANDY'),
('Huawei', 'Mate 60 Pro', 'HANDY'),
('Huawei', 'Mate 60 Pro+', 'HANDY'),
('Huawei', 'Nova 12', 'HANDY'),
('Huawei', 'Nova 12 Pro', 'HANDY'),
('Huawei', 'Nova 12 Ultra', 'HANDY')
ON CONFLICT DO NOTHING;

-- Step 8: Insert missing Google Pixel models
INSERT INTO device_catalog (brand, model, device_type) VALUES
('Google', 'Pixel 8 Pro', 'HANDY'),
('Google', 'Pixel 8a', 'HANDY'),
('Google', 'Pixel 9', 'HANDY'),
('Google', 'Pixel 9 Pro', 'HANDY'),
('Google', 'Pixel 9 Pro XL', 'HANDY'),
('Google', 'Pixel 9 Pro Fold', 'HANDY')
ON CONFLICT DO NOTHING;

-- Step 9: Insert missing OnePlus models
INSERT INTO device_catalog (brand, model, device_type) VALUES
('OnePlus', '12', 'HANDY'),
('OnePlus', '12R', 'HANDY'),
('OnePlus', '13', 'HANDY'),
('OnePlus', '13R', 'HANDY'),
('OnePlus', 'Open', 'HANDY'),
('OnePlus', 'Nord 4', 'HANDY'),
('OnePlus', 'Nord CE 4', 'HANDY')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Step 10: Set sort_order for Apple models (newest-to-oldest)
-- Lower sort_order = appears first in dropdown
-- ============================================================

-- iPhone 16 series (newest, sort_order 100-103)
UPDATE device_catalog SET sort_order = 100 WHERE brand = 'Apple' AND model = 'iPhone 16e';
UPDATE device_catalog SET sort_order = 101 WHERE brand = 'Apple' AND model = 'iPhone 16 Pro Max';
UPDATE device_catalog SET sort_order = 102 WHERE brand = 'Apple' AND model = 'iPhone 16 Pro';
UPDATE device_catalog SET sort_order = 103 WHERE brand = 'Apple' AND model = 'iPhone 16 Plus';
UPDATE device_catalog SET sort_order = 104 WHERE brand = 'Apple' AND model = 'iPhone 16';

-- iPhone 15 series (sort_order 200-203)
UPDATE device_catalog SET sort_order = 200 WHERE brand = 'Apple' AND model = 'iPhone 15 Pro Max';
UPDATE device_catalog SET sort_order = 201 WHERE brand = 'Apple' AND model = 'iPhone 15 Pro';
UPDATE device_catalog SET sort_order = 202 WHERE brand = 'Apple' AND model = 'iPhone 15 Plus';
UPDATE device_catalog SET sort_order = 203 WHERE brand = 'Apple' AND model = 'iPhone 15';

-- iPhone 14 series (sort_order 300-303)
UPDATE device_catalog SET sort_order = 300 WHERE brand = 'Apple' AND model = 'iPhone 14 Pro Max';
UPDATE device_catalog SET sort_order = 301 WHERE brand = 'Apple' AND model = 'iPhone 14 Pro';
UPDATE device_catalog SET sort_order = 302 WHERE brand = 'Apple' AND model = 'iPhone 14 Plus';
UPDATE device_catalog SET sort_order = 303 WHERE brand = 'Apple' AND model = 'iPhone 14';

-- iPhone 13 series (sort_order 400-403)
UPDATE device_catalog SET sort_order = 400 WHERE brand = 'Apple' AND model = 'iPhone 13 Pro Max';
UPDATE device_catalog SET sort_order = 401 WHERE brand = 'Apple' AND model = 'iPhone 13 Pro';
UPDATE device_catalog SET sort_order = 402 WHERE brand = 'Apple' AND model = 'iPhone 13 mini';
UPDATE device_catalog SET sort_order = 403 WHERE brand = 'Apple' AND model = 'iPhone 13';

-- iPhone 12 series (sort_order 500-503)
UPDATE device_catalog SET sort_order = 500 WHERE brand = 'Apple' AND model = 'iPhone 12 Pro Max';
UPDATE device_catalog SET sort_order = 501 WHERE brand = 'Apple' AND model = 'iPhone 12 Pro';
UPDATE device_catalog SET sort_order = 502 WHERE brand = 'Apple' AND model = 'iPhone 12 mini';
UPDATE device_catalog SET sort_order = 503 WHERE brand = 'Apple' AND model = 'iPhone 12';

-- iPhone 11 series (sort_order 600-602)
UPDATE device_catalog SET sort_order = 600 WHERE brand = 'Apple' AND model = 'iPhone 11 Pro Max';
UPDATE device_catalog SET sort_order = 601 WHERE brand = 'Apple' AND model = 'iPhone 11 Pro';
UPDATE device_catalog SET sort_order = 602 WHERE brand = 'Apple' AND model = 'iPhone 11';

-- iPhone XS/XR/X series (sort_order 700-703)
UPDATE device_catalog SET sort_order = 700 WHERE brand = 'Apple' AND model = 'iPhone XS Max';
UPDATE device_catalog SET sort_order = 701 WHERE brand = 'Apple' AND model = 'iPhone XS';
UPDATE device_catalog SET sort_order = 702 WHERE brand = 'Apple' AND model = 'iPhone XR';
UPDATE device_catalog SET sort_order = 703 WHERE brand = 'Apple' AND model = 'iPhone X';

-- iPhone 8 series (sort_order 800-801)
UPDATE device_catalog SET sort_order = 800 WHERE brand = 'Apple' AND model = 'iPhone 8 Plus';
UPDATE device_catalog SET sort_order = 801 WHERE brand = 'Apple' AND model = 'iPhone 8';

-- iPhone 7 series (sort_order 900-901)
UPDATE device_catalog SET sort_order = 900 WHERE brand = 'Apple' AND model = 'iPhone 7 Plus';
UPDATE device_catalog SET sort_order = 901 WHERE brand = 'Apple' AND model = 'iPhone 7';

-- iPhone 6s series (sort_order 1000-1001)
UPDATE device_catalog SET sort_order = 1000 WHERE brand = 'Apple' AND model = 'iPhone 6s Plus';
UPDATE device_catalog SET sort_order = 1001 WHERE brand = 'Apple' AND model = 'iPhone 6s';

-- iPhone 6 series (oldest, sort_order 1100-1101)
UPDATE device_catalog SET sort_order = 1100 WHERE brand = 'Apple' AND model = 'iPhone 6 Plus';
UPDATE device_catalog SET sort_order = 1101 WHERE brand = 'Apple' AND model = 'iPhone 6';

-- iPhone SE series (sort by year, after main lineup)
UPDATE device_catalog SET sort_order = 150 WHERE brand = 'Apple' AND model = 'iPhone SE (3. Gen)';
UPDATE device_catalog SET sort_order = 350 WHERE brand = 'Apple' AND model = 'iPhone SE (2022)';
UPDATE device_catalog SET sort_order = 550 WHERE brand = 'Apple' AND model = 'iPhone SE (2020)';
UPDATE device_catalog SET sort_order = 1050 WHERE brand = 'Apple' AND model = 'iPhone SE (2016)';

-- ============================================================
-- Step 11: Set sort_order for non-Apple brands (alphabetical)
-- For non-Apple, we use a calculated sort_order based on model name
-- ============================================================

-- For non-Apple brands, set sort_order based on alphabetical order
-- Using ROW_NUMBER to assign sequential sort_order per brand
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY brand ORDER BY lower(model)) * 10 as new_sort
  FROM device_catalog
  WHERE brand != 'Apple' AND device_type = 'HANDY'
)
UPDATE device_catalog
SET sort_order = ranked.new_sort
FROM ranked
WHERE device_catalog.id = ranked.id;