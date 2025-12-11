-- ============================================================
-- DEVICE CATALOG: Add tablet models and set sort_order
-- ============================================================
-- Sorting logic:
-- - Apple iPads: newest-to-oldest (iPad Pro M4 first, older iPads last)
-- - Other brands: alphabetical order by model name
-- ============================================================

-- Step 1: Insert missing Apple iPad models
INSERT INTO device_catalog (brand, model, device_type) VALUES
-- iPad Pro M4 (2024, newest)
('Apple', 'iPad Pro 11" M4', 'TABLET'),
('Apple', 'iPad Pro 13" M4', 'TABLET'),
-- iPad Air M2 (2024)
('Apple', 'iPad Air 11" M2', 'TABLET'),
('Apple', 'iPad Air 13" M2', 'TABLET'),
-- iPad 10. Gen / iPad mini
('Apple', 'iPad mini 7', 'TABLET'),
-- Older iPad Pros
('Apple', 'iPad Pro 11" (2. Gen)', 'TABLET'),
('Apple', 'iPad Pro 11" (1. Gen)', 'TABLET'),
('Apple', 'iPad Pro 12.9" (4. Gen)', 'TABLET'),
('Apple', 'iPad Pro 12.9" (3. Gen)', 'TABLET'),
('Apple', 'iPad Pro 12.9" (2. Gen)', 'TABLET'),
('Apple', 'iPad Pro 12.9" (1. Gen)', 'TABLET'),
-- Older iPad Air
('Apple', 'iPad Air 3', 'TABLET'),
('Apple', 'iPad Air 2', 'TABLET'),
('Apple', 'iPad Air', 'TABLET'),
-- Older iPad mini
('Apple', 'iPad mini 5', 'TABLET'),
('Apple', 'iPad mini 4', 'TABLET'),
-- Older iPads
('Apple', 'iPad 7', 'TABLET'),
('Apple', 'iPad 6', 'TABLET'),
('Apple', 'iPad 5', 'TABLET')
ON CONFLICT DO NOTHING;

-- Step 2: Insert missing Samsung Galaxy Tab models
INSERT INTO device_catalog (brand, model, device_type) VALUES
-- Galaxy Tab S10 series (newest)
('Samsung', 'Galaxy Tab S10 Ultra', 'TABLET'),
('Samsung', 'Galaxy Tab S10+', 'TABLET'),
-- Galaxy Tab S9 FE series
('Samsung', 'Galaxy Tab S9 FE', 'TABLET'),
('Samsung', 'Galaxy Tab S9 FE+', 'TABLET'),
-- Older Tab S series
('Samsung', 'Galaxy Tab S7', 'TABLET'),
('Samsung', 'Galaxy Tab S7+', 'TABLET'),
('Samsung', 'Galaxy Tab S7 FE', 'TABLET'),
('Samsung', 'Galaxy Tab S6', 'TABLET'),
('Samsung', 'Galaxy Tab S6 Lite', 'TABLET'),
-- Older Tab A series
('Samsung', 'Galaxy Tab A7', 'TABLET'),
('Samsung', 'Galaxy Tab A7 Lite', 'TABLET')
ON CONFLICT DO NOTHING;

-- Step 3: Insert Lenovo tablets
INSERT INTO device_catalog (brand, model, device_type) VALUES
('Lenovo', 'Tab P12', 'TABLET'),
('Lenovo', 'Tab P12 Pro', 'TABLET'),
('Lenovo', 'Tab P11 Pro', 'TABLET'),
('Lenovo', 'Tab P11', 'TABLET'),
('Lenovo', 'Tab M11', 'TABLET'),
('Lenovo', 'Tab M10 Plus', 'TABLET'),
('Lenovo', 'Tab M10', 'TABLET'),
('Lenovo', 'Yoga Tab 13', 'TABLET'),
('Lenovo', 'Yoga Tab 11', 'TABLET')
ON CONFLICT DO NOTHING;

-- Step 4: Insert Huawei tablets
INSERT INTO device_catalog (brand, model, device_type) VALUES
('Huawei', 'MatePad Pro 13.2"', 'TABLET'),
('Huawei', 'MatePad Pro 11"', 'TABLET'),
('Huawei', 'MatePad 11.5"', 'TABLET'),
('Huawei', 'MatePad Air', 'TABLET'),
('Huawei', 'MatePad SE', 'TABLET'),
('Huawei', 'MatePad T10', 'TABLET'),
('Huawei', 'MatePad T10s', 'TABLET')
ON CONFLICT DO NOTHING;

-- Step 5: Insert Xiaomi tablets
INSERT INTO device_catalog (brand, model, device_type) VALUES
('Xiaomi', 'Pad 6S Pro', 'TABLET'),
('Xiaomi', 'Pad 6', 'TABLET'),
('Xiaomi', 'Pad 6 Pro', 'TABLET'),
('Xiaomi', 'Pad 5', 'TABLET'),
('Xiaomi', 'Pad 5 Pro', 'TABLET'),
('Xiaomi', 'Redmi Pad Pro', 'TABLET'),
('Xiaomi', 'Redmi Pad SE', 'TABLET'),
('Xiaomi', 'Redmi Pad', 'TABLET')
ON CONFLICT DO NOTHING;

-- Step 6: Insert Microsoft Surface tablets
INSERT INTO device_catalog (brand, model, device_type) VALUES
('Microsoft', 'Surface Pro 10', 'TABLET'),
('Microsoft', 'Surface Pro 9', 'TABLET'),
('Microsoft', 'Surface Pro 8', 'TABLET'),
('Microsoft', 'Surface Pro 7+', 'TABLET'),
('Microsoft', 'Surface Pro 7', 'TABLET'),
('Microsoft', 'Surface Go 4', 'TABLET'),
('Microsoft', 'Surface Go 3', 'TABLET')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Step 7: Set sort_order for Apple iPads (newest-to-oldest)
-- ============================================================

-- iPad Pro M4 (2024, newest)
UPDATE device_catalog SET sort_order = 100 WHERE brand = 'Apple' AND model = 'iPad Pro 13" M4' AND device_type = 'TABLET';
UPDATE device_catalog SET sort_order = 101 WHERE brand = 'Apple' AND model = 'iPad Pro 11" M4' AND device_type = 'TABLET';

-- iPad Air M2 (2024)
UPDATE device_catalog SET sort_order = 150 WHERE brand = 'Apple' AND model = 'iPad Air 13" M2' AND device_type = 'TABLET';
UPDATE device_catalog SET sort_order = 151 WHERE brand = 'Apple' AND model = 'iPad Air 11" M2' AND device_type = 'TABLET';

-- iPad Pro 6th Gen (M2)
UPDATE device_catalog SET sort_order = 200 WHERE brand = 'Apple' AND model = 'iPad Pro 12.9" (6. Gen)' AND device_type = 'TABLET';
UPDATE device_catalog SET sort_order = 201 WHERE brand = 'Apple' AND model = 'iPad Pro 11" (4. Gen)' AND device_type = 'TABLET';

-- iPad 10th Gen (2022)
UPDATE device_catalog SET sort_order = 250 WHERE brand = 'Apple' AND model = 'iPad 10' AND device_type = 'TABLET';

-- iPad mini 7 (2024)
UPDATE device_catalog SET sort_order = 260 WHERE brand = 'Apple' AND model = 'iPad mini 7' AND device_type = 'TABLET';

-- iPad Air 5 (M1)
UPDATE device_catalog SET sort_order = 300 WHERE brand = 'Apple' AND model = 'iPad Air 5' AND device_type = 'TABLET';

-- iPad Pro 5th Gen
UPDATE device_catalog SET sort_order = 350 WHERE brand = 'Apple' AND model = 'iPad Pro 12.9" (5. Gen)' AND device_type = 'TABLET';
UPDATE device_catalog SET sort_order = 351 WHERE brand = 'Apple' AND model = 'iPad Pro 11" (3. Gen)' AND device_type = 'TABLET';

-- iPad 9 (2021)
UPDATE device_catalog SET sort_order = 400 WHERE brand = 'Apple' AND model = 'iPad 9' AND device_type = 'TABLET';

-- iPad mini 6 (2021)
UPDATE device_catalog SET sort_order = 410 WHERE brand = 'Apple' AND model = 'iPad mini 6' AND device_type = 'TABLET';

-- iPad Air 4 (2020)
UPDATE device_catalog SET sort_order = 450 WHERE brand = 'Apple' AND model = 'iPad Air 4' AND device_type = 'TABLET';

-- iPad 8 (2020)
UPDATE device_catalog SET sort_order = 500 WHERE brand = 'Apple' AND model = 'iPad 8' AND device_type = 'TABLET';

-- Older iPad Pros
UPDATE device_catalog SET sort_order = 550 WHERE brand = 'Apple' AND model = 'iPad Pro 11" (2. Gen)' AND device_type = 'TABLET';
UPDATE device_catalog SET sort_order = 551 WHERE brand = 'Apple' AND model = 'iPad Pro 12.9" (4. Gen)' AND device_type = 'TABLET';
UPDATE device_catalog SET sort_order = 600 WHERE brand = 'Apple' AND model = 'iPad Pro 11" (1. Gen)' AND device_type = 'TABLET';
UPDATE device_catalog SET sort_order = 601 WHERE brand = 'Apple' AND model = 'iPad Pro 12.9" (3. Gen)' AND device_type = 'TABLET';
UPDATE device_catalog SET sort_order = 650 WHERE brand = 'Apple' AND model = 'iPad Pro 12.9" (2. Gen)' AND device_type = 'TABLET';
UPDATE device_catalog SET sort_order = 700 WHERE brand = 'Apple' AND model = 'iPad Pro 12.9" (1. Gen)' AND device_type = 'TABLET';

-- Older iPads
UPDATE device_catalog SET sort_order = 750 WHERE brand = 'Apple' AND model = 'iPad 7' AND device_type = 'TABLET';
UPDATE device_catalog SET sort_order = 800 WHERE brand = 'Apple' AND model = 'iPad 6' AND device_type = 'TABLET';
UPDATE device_catalog SET sort_order = 850 WHERE brand = 'Apple' AND model = 'iPad 5' AND device_type = 'TABLET';

-- Older iPad Air
UPDATE device_catalog SET sort_order = 900 WHERE brand = 'Apple' AND model = 'iPad Air 3' AND device_type = 'TABLET';
UPDATE device_catalog SET sort_order = 950 WHERE brand = 'Apple' AND model = 'iPad Air 2' AND device_type = 'TABLET';
UPDATE device_catalog SET sort_order = 1000 WHERE brand = 'Apple' AND model = 'iPad Air' AND device_type = 'TABLET';

-- Older iPad mini
UPDATE device_catalog SET sort_order = 1050 WHERE brand = 'Apple' AND model = 'iPad mini 5' AND device_type = 'TABLET';
UPDATE device_catalog SET sort_order = 1100 WHERE brand = 'Apple' AND model = 'iPad mini 4' AND device_type = 'TABLET';

-- ============================================================
-- Step 8: Set sort_order for non-Apple tablets (alphabetical)
-- ============================================================

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY brand ORDER BY lower(model)) * 10 as new_sort
  FROM device_catalog
  WHERE brand != 'Apple' AND device_type = 'TABLET'
)
UPDATE device_catalog
SET sort_order = ranked.new_sort
FROM ranked
WHERE device_catalog.id = ranked.id;