-- 1) Create manufacturers table
CREATE TABLE IF NOT EXISTS public.manufacturers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.manufacturers ENABLE ROW LEVEL SECURITY;

-- RLS policies for manufacturers
CREATE POLICY "Employees can view manufacturers"
  ON public.manufacturers FOR SELECT
  USING (is_employee(auth.uid()));

CREATE POLICY "Admins can manage manufacturers"
  ON public.manufacturers FOR ALL
  USING (has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'FILIALLEITER'));

-- 2) Create part_category enum type
DO $$ BEGIN
  CREATE TYPE part_category_enum AS ENUM (
    'DISPLAY',
    'AKKU',
    'LADEBUCHSE',
    'KAMERA_VORNE',
    'KAMERA_HINTEN',
    'LAUTSPRECHER',
    'MIKROFON',
    'BACKCOVER',
    'RAHMEN',
    'FLEXKABEL',
    'BUTTONS',
    'VIBRATIONSMOTOR',
    'SONSTIGES'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3) Populate manufacturers from existing device_catalog brands
INSERT INTO public.manufacturers (name)
SELECT DISTINCT brand FROM public.device_catalog
WHERE brand IS NOT NULL AND brand != ''
ON CONFLICT (name) DO NOTHING;

-- Also add manufacturers from existing parts
INSERT INTO public.manufacturers (name)
SELECT DISTINCT brand FROM public.parts
WHERE brand IS NOT NULL AND brand != ''
ON CONFLICT (name) DO NOTHING;

-- 4) Add manufacturer_id column to parts table
ALTER TABLE public.parts 
ADD COLUMN IF NOT EXISTS manufacturer_id UUID REFERENCES public.manufacturers(id);

-- 5) Add model_id column to parts table (references device_catalog)
ALTER TABLE public.parts 
ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES public.device_catalog(id);

-- 6) Update existing parts to link to manufacturers
UPDATE public.parts p
SET manufacturer_id = m.id
FROM public.manufacturers m
WHERE LOWER(p.brand) = LOWER(m.name)
AND p.manufacturer_id IS NULL;

-- 7) Update existing parts to link to models
UPDATE public.parts p
SET model_id = dc.id
FROM public.device_catalog dc
WHERE LOWER(p.brand) = LOWER(dc.brand)
AND LOWER(p.model) = LOWER(dc.model)
AND p.model_id IS NULL;

-- 8) Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_parts_manufacturer_id ON public.parts(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_parts_model_id ON public.parts(model_id);
CREATE INDEX IF NOT EXISTS idx_parts_part_category ON public.parts(part_category);
CREATE INDEX IF NOT EXISTS idx_parts_device_type ON public.parts(device_type);