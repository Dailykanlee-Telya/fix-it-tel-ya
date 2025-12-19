-- Add new columns to parts table for improved structure
ALTER TABLE public.parts 
ADD COLUMN IF NOT EXISTS device_type text DEFAULT 'HANDY',
ADD COLUMN IF NOT EXISTS part_category text DEFAULT 'SONSTIGES',
ADD COLUMN IF NOT EXISTS supplier_sku text,
ADD COLUMN IF NOT EXISTS storage_location text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN public.parts.device_type IS 'Device type: HANDY, TABLET, LAPTOP, SMARTWATCH, OTHER';
COMMENT ON COLUMN public.parts.part_category IS 'Part category: DISPLAY, AKKU, LADEBUCHSE, KAMERA, BACKCOVER, RAHMEN, LAUTSPRECHER, MIKROFON, BUTTON, FLEXKABEL, SONSTIGES';
COMMENT ON COLUMN public.parts.supplier_sku IS 'Supplier article number';
COMMENT ON COLUMN public.parts.storage_location IS 'Storage location (shelf/compartment)';
COMMENT ON COLUMN public.parts.is_active IS 'Whether the part is active in inventory';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_parts_device_type ON public.parts(device_type);
CREATE INDEX IF NOT EXISTS idx_parts_part_category ON public.parts(part_category);
CREATE INDEX IF NOT EXISTS idx_parts_brand ON public.parts(brand);
CREATE INDEX IF NOT EXISTS idx_parts_is_active ON public.parts(is_active);

-- Add ABHOLSCHEIN document template
INSERT INTO public.document_templates (type, locale, title, intro, conditions, footer)
VALUES (
  'ABHOLSCHEIN',
  'de',
  'ABHOLSCHEIN',
  'Ihr Gerät wurde zur Reparatur angenommen.',
  'Bitte bringen Sie diesen Abholschein bei der Abholung mit. Ohne Abholschein kann eine Ausweiskontrolle erforderlich sein.',
  'Vielen Dank für Ihr Vertrauen!'
) ON CONFLICT DO NOTHING;