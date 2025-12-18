-- ============================================
-- Device Catalog: Add realme models and improve Apple sorting
-- ============================================

-- First, update existing Apple iPhones with proper sort_order (newer = lower number)
-- iPhone 17 series (newest)
UPDATE device_catalog SET sort_order = 10 WHERE brand = 'Apple' AND model ILIKE '%iPhone 17 Pro Max%';
UPDATE device_catalog SET sort_order = 11 WHERE brand = 'Apple' AND model ILIKE '%iPhone 17 Pro%' AND model NOT ILIKE '%Max%';
UPDATE device_catalog SET sort_order = 12 WHERE brand = 'Apple' AND model ILIKE '%iPhone 17 Plus%';
UPDATE device_catalog SET sort_order = 13 WHERE brand = 'Apple' AND model ILIKE '%iPhone 17%' AND model NOT ILIKE '%Pro%' AND model NOT ILIKE '%Plus%';

-- iPhone 16 series
UPDATE device_catalog SET sort_order = 20 WHERE brand = 'Apple' AND model ILIKE '%iPhone 16 Pro Max%';
UPDATE device_catalog SET sort_order = 21 WHERE brand = 'Apple' AND model ILIKE '%iPhone 16 Pro%' AND model NOT ILIKE '%Max%';
UPDATE device_catalog SET sort_order = 22 WHERE brand = 'Apple' AND model ILIKE '%iPhone 16 Plus%';
UPDATE device_catalog SET sort_order = 23 WHERE brand = 'Apple' AND model ILIKE '%iPhone 16e%';
UPDATE device_catalog SET sort_order = 24 WHERE brand = 'Apple' AND model ILIKE '%iPhone 16%' AND model NOT ILIKE '%Pro%' AND model NOT ILIKE '%Plus%' AND model NOT ILIKE '%e%';

-- iPhone 15 series
UPDATE device_catalog SET sort_order = 30 WHERE brand = 'Apple' AND model ILIKE '%iPhone 15 Pro Max%';
UPDATE device_catalog SET sort_order = 31 WHERE brand = 'Apple' AND model ILIKE '%iPhone 15 Pro%' AND model NOT ILIKE '%Max%';
UPDATE device_catalog SET sort_order = 32 WHERE brand = 'Apple' AND model ILIKE '%iPhone 15 Plus%';
UPDATE device_catalog SET sort_order = 33 WHERE brand = 'Apple' AND model ILIKE '%iPhone 15%' AND model NOT ILIKE '%Pro%' AND model NOT ILIKE '%Plus%';

-- iPhone 14 series
UPDATE device_catalog SET sort_order = 40 WHERE brand = 'Apple' AND model ILIKE '%iPhone 14 Pro Max%';
UPDATE device_catalog SET sort_order = 41 WHERE brand = 'Apple' AND model ILIKE '%iPhone 14 Pro%' AND model NOT ILIKE '%Max%';
UPDATE device_catalog SET sort_order = 42 WHERE brand = 'Apple' AND model ILIKE '%iPhone 14 Plus%';
UPDATE device_catalog SET sort_order = 43 WHERE brand = 'Apple' AND model ILIKE '%iPhone 14%' AND model NOT ILIKE '%Pro%' AND model NOT ILIKE '%Plus%';

-- iPhone 13 series
UPDATE device_catalog SET sort_order = 50 WHERE brand = 'Apple' AND model ILIKE '%iPhone 13 Pro Max%';
UPDATE device_catalog SET sort_order = 51 WHERE brand = 'Apple' AND model ILIKE '%iPhone 13 Pro%' AND model NOT ILIKE '%Max%';
UPDATE device_catalog SET sort_order = 52 WHERE brand = 'Apple' AND model ILIKE '%iPhone 13 mini%';
UPDATE device_catalog SET sort_order = 53 WHERE brand = 'Apple' AND model ILIKE '%iPhone 13%' AND model NOT ILIKE '%Pro%' AND model NOT ILIKE '%mini%';

-- iPhone 12 series
UPDATE device_catalog SET sort_order = 60 WHERE brand = 'Apple' AND model ILIKE '%iPhone 12 Pro Max%';
UPDATE device_catalog SET sort_order = 61 WHERE brand = 'Apple' AND model ILIKE '%iPhone 12 Pro%' AND model NOT ILIKE '%Max%';
UPDATE device_catalog SET sort_order = 62 WHERE brand = 'Apple' AND model ILIKE '%iPhone 12 mini%';
UPDATE device_catalog SET sort_order = 63 WHERE brand = 'Apple' AND model ILIKE '%iPhone 12%' AND model NOT ILIKE '%Pro%' AND model NOT ILIKE '%mini%';

-- iPhone 11 series
UPDATE device_catalog SET sort_order = 70 WHERE brand = 'Apple' AND model ILIKE '%iPhone 11 Pro Max%';
UPDATE device_catalog SET sort_order = 71 WHERE brand = 'Apple' AND model ILIKE '%iPhone 11 Pro%' AND model NOT ILIKE '%Max%';
UPDATE device_catalog SET sort_order = 72 WHERE brand = 'Apple' AND model ILIKE '%iPhone 11%' AND model NOT ILIKE '%Pro%';

-- iPhone X series
UPDATE device_catalog SET sort_order = 80 WHERE brand = 'Apple' AND model ILIKE '%iPhone XS Max%';
UPDATE device_catalog SET sort_order = 81 WHERE brand = 'Apple' AND model ILIKE '%iPhone XS%' AND model NOT ILIKE '%Max%';
UPDATE device_catalog SET sort_order = 82 WHERE brand = 'Apple' AND model ILIKE '%iPhone XR%';
UPDATE device_catalog SET sort_order = 83 WHERE brand = 'Apple' AND model ILIKE '%iPhone X%' AND model NOT ILIKE '%S%' AND model NOT ILIKE '%R%';

-- iPhone SE series
UPDATE device_catalog SET sort_order = 85 WHERE brand = 'Apple' AND model ILIKE '%iPhone SE (2022)%';
UPDATE device_catalog SET sort_order = 86 WHERE brand = 'Apple' AND model ILIKE '%iPhone SE (2020)%';
UPDATE device_catalog SET sort_order = 87 WHERE brand = 'Apple' AND model ILIKE '%iPhone SE%' AND model NOT ILIKE '%(20%';

-- iPhone 8 series
UPDATE device_catalog SET sort_order = 90 WHERE brand = 'Apple' AND model ILIKE '%iPhone 8 Plus%';
UPDATE device_catalog SET sort_order = 91 WHERE brand = 'Apple' AND model ILIKE '%iPhone 8%' AND model NOT ILIKE '%Plus%';

-- iPhone 7 series
UPDATE device_catalog SET sort_order = 100 WHERE brand = 'Apple' AND model ILIKE '%iPhone 7 Plus%';
UPDATE device_catalog SET sort_order = 101 WHERE brand = 'Apple' AND model ILIKE '%iPhone 7%' AND model NOT ILIKE '%Plus%';

-- iPhone 6 series
UPDATE device_catalog SET sort_order = 110 WHERE brand = 'Apple' AND model ILIKE '%iPhone 6s Plus%';
UPDATE device_catalog SET sort_order = 111 WHERE brand = 'Apple' AND model ILIKE '%iPhone 6s%' AND model NOT ILIKE '%Plus%';
UPDATE device_catalog SET sort_order = 112 WHERE brand = 'Apple' AND model ILIKE '%iPhone 6 Plus%' AND model NOT ILIKE '%s%';
UPDATE device_catalog SET sort_order = 113 WHERE brand = 'Apple' AND model ILIKE '%iPhone 6%' AND model NOT ILIKE '%Plus%' AND model NOT ILIKE '%s%';

-- ============================================
-- Insert realme smartphone models
-- ============================================

-- realme Number Series (main flagship line)
INSERT INTO device_catalog (brand, model, device_type, sort_order) VALUES
  ('realme', 'realme 14 Pro+ 5G', 'HANDY', 10),
  ('realme', 'realme 14 Pro 5G', 'HANDY', 11),
  ('realme', 'realme 14 5G', 'HANDY', 12),
  ('realme', 'realme 13 Pro+ 5G', 'HANDY', 20),
  ('realme', 'realme 13 Pro 5G', 'HANDY', 21),
  ('realme', 'realme 13+ 5G', 'HANDY', 22),
  ('realme', 'realme 13 5G', 'HANDY', 23),
  ('realme', 'realme 12 Pro+ 5G', 'HANDY', 30),
  ('realme', 'realme 12 Pro 5G', 'HANDY', 31),
  ('realme', 'realme 12+ 5G', 'HANDY', 32),
  ('realme', 'realme 12 5G', 'HANDY', 33),
  ('realme', 'realme 11 Pro+ 5G', 'HANDY', 40),
  ('realme', 'realme 11 Pro 5G', 'HANDY', 41),
  ('realme', 'realme 11 5G', 'HANDY', 42),
  ('realme', 'realme 11', 'HANDY', 43),
  ('realme', 'realme 10 Pro+ 5G', 'HANDY', 50),
  ('realme', 'realme 10 Pro 5G', 'HANDY', 51),
  ('realme', 'realme 10 5G', 'HANDY', 52),
  ('realme', 'realme 10', 'HANDY', 53),
  ('realme', 'realme 9 Pro+ 5G', 'HANDY', 60),
  ('realme', 'realme 9 Pro 5G', 'HANDY', 61),
  ('realme', 'realme 9 5G', 'HANDY', 62),
  ('realme', 'realme 9', 'HANDY', 63),
  ('realme', 'realme 8 Pro', 'HANDY', 70),
  ('realme', 'realme 8 5G', 'HANDY', 71),
  ('realme', 'realme 8', 'HANDY', 72),
  ('realme', 'realme 7 Pro', 'HANDY', 80),
  ('realme', 'realme 7 5G', 'HANDY', 81),
  ('realme', 'realme 7', 'HANDY', 82)
ON CONFLICT (brand, model) DO UPDATE SET sort_order = EXCLUDED.sort_order;

-- realme GT Series (performance/gaming line)
INSERT INTO device_catalog (brand, model, device_type, sort_order) VALUES
  ('realme', 'realme GT 7 Pro', 'HANDY', 100),
  ('realme', 'realme GT 7', 'HANDY', 101),
  ('realme', 'realme GT 6T', 'HANDY', 110),
  ('realme', 'realme GT 6', 'HANDY', 111),
  ('realme', 'realme GT 5 Pro', 'HANDY', 120),
  ('realme', 'realme GT 5', 'HANDY', 121),
  ('realme', 'realme GT 3', 'HANDY', 130),
  ('realme', 'realme GT 2 Pro', 'HANDY', 140),
  ('realme', 'realme GT 2', 'HANDY', 141),
  ('realme', 'realme GT Neo 6 SE', 'HANDY', 150),
  ('realme', 'realme GT Neo 6', 'HANDY', 151),
  ('realme', 'realme GT Neo 5 SE', 'HANDY', 160),
  ('realme', 'realme GT Neo 5', 'HANDY', 161),
  ('realme', 'realme GT Neo 3T', 'HANDY', 170),
  ('realme', 'realme GT Neo 3', 'HANDY', 171),
  ('realme', 'realme GT Neo 2T', 'HANDY', 180),
  ('realme', 'realme GT Neo 2', 'HANDY', 181),
  ('realme', 'realme GT Neo', 'HANDY', 190),
  ('realme', 'realme GT Master Edition', 'HANDY', 200),
  ('realme', 'realme GT', 'HANDY', 210)
ON CONFLICT (brand, model) DO UPDATE SET sort_order = EXCLUDED.sort_order;

-- realme C Series (budget line)
INSERT INTO device_catalog (brand, model, device_type, sort_order) VALUES
  ('realme', 'realme C75', 'HANDY', 300),
  ('realme', 'realme C73', 'HANDY', 301),
  ('realme', 'realme C67 5G', 'HANDY', 310),
  ('realme', 'realme C67', 'HANDY', 311),
  ('realme', 'realme C65', 'HANDY', 320),
  ('realme', 'realme C63', 'HANDY', 321),
  ('realme', 'realme C61', 'HANDY', 322),
  ('realme', 'realme C55', 'HANDY', 330),
  ('realme', 'realme C53', 'HANDY', 331),
  ('realme', 'realme C51', 'HANDY', 332),
  ('realme', 'realme C35', 'HANDY', 340),
  ('realme', 'realme C33', 'HANDY', 341),
  ('realme', 'realme C31', 'HANDY', 342),
  ('realme', 'realme C30s', 'HANDY', 350),
  ('realme', 'realme C30', 'HANDY', 351),
  ('realme', 'realme C25Y', 'HANDY', 360),
  ('realme', 'realme C25s', 'HANDY', 361),
  ('realme', 'realme C25', 'HANDY', 362),
  ('realme', 'realme C21Y', 'HANDY', 370),
  ('realme', 'realme C21', 'HANDY', 371),
  ('realme', 'realme C20', 'HANDY', 372),
  ('realme', 'realme C15', 'HANDY', 380),
  ('realme', 'realme C12', 'HANDY', 381),
  ('realme', 'realme C11', 'HANDY', 382),
  ('realme', 'realme C3', 'HANDY', 390)
ON CONFLICT (brand, model) DO UPDATE SET sort_order = EXCLUDED.sort_order;

-- realme Narzo Series (mid-range)
INSERT INTO device_catalog (brand, model, device_type, sort_order) VALUES
  ('realme', 'realme Narzo 70 Pro 5G', 'HANDY', 400),
  ('realme', 'realme Narzo 70x 5G', 'HANDY', 401),
  ('realme', 'realme Narzo 70 5G', 'HANDY', 402),
  ('realme', 'realme Narzo 60 Pro 5G', 'HANDY', 410),
  ('realme', 'realme Narzo 60x 5G', 'HANDY', 411),
  ('realme', 'realme Narzo 60 5G', 'HANDY', 412),
  ('realme', 'realme Narzo 50 Pro 5G', 'HANDY', 420),
  ('realme', 'realme Narzo 50 5G', 'HANDY', 421),
  ('realme', 'realme Narzo 50A Prime', 'HANDY', 422),
  ('realme', 'realme Narzo 50A', 'HANDY', 423),
  ('realme', 'realme Narzo 50', 'HANDY', 424)
ON CONFLICT (brand, model) DO UPDATE SET sort_order = EXCLUDED.sort_order;

-- realme X Series (discontinued but still relevant)
INSERT INTO device_catalog (brand, model, device_type, sort_order) VALUES
  ('realme', 'realme X7 Pro', 'HANDY', 500),
  ('realme', 'realme X7 Max 5G', 'HANDY', 501),
  ('realme', 'realme X7 5G', 'HANDY', 502),
  ('realme', 'realme X50 Pro 5G', 'HANDY', 510),
  ('realme', 'realme X50 5G', 'HANDY', 511),
  ('realme', 'realme X3 SuperZoom', 'HANDY', 520),
  ('realme', 'realme X3', 'HANDY', 521),
  ('realme', 'realme X2 Pro', 'HANDY', 530),
  ('realme', 'realme X2', 'HANDY', 531),
  ('realme', 'realme XT', 'HANDY', 540),
  ('realme', 'realme X', 'HANDY', 550)
ON CONFLICT (brand, model) DO UPDATE SET sort_order = EXCLUDED.sort_order;

-- realme V Series (5G focused, mainly available in EU)
INSERT INTO device_catalog (brand, model, device_type, sort_order) VALUES
  ('realme', 'realme V30t', 'HANDY', 600),
  ('realme', 'realme V30', 'HANDY', 601),
  ('realme', 'realme V25', 'HANDY', 610),
  ('realme', 'realme V23', 'HANDY', 611),
  ('realme', 'realme V20 Pro', 'HANDY', 620),
  ('realme', 'realme V20', 'HANDY', 621)
ON CONFLICT (brand, model) DO UPDATE SET sort_order = EXCLUDED.sort_order;

-- realme P Series (newer mid-range)
INSERT INTO device_catalog (brand, model, device_type, sort_order) VALUES
  ('realme', 'realme P1 Pro 5G', 'HANDY', 250),
  ('realme', 'realme P1 Speed 5G', 'HANDY', 251),
  ('realme', 'realme P1 5G', 'HANDY', 252)
ON CONFLICT (brand, model) DO UPDATE SET sort_order = EXCLUDED.sort_order;

-- ============================================
-- Add unique constraint if not exists
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'device_catalog_brand_model_key'
  ) THEN
    ALTER TABLE device_catalog ADD CONSTRAINT device_catalog_brand_model_key UNIQUE (brand, model);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;