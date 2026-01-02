-- Add category, note, and customer_visible fields to ticket_photos
ALTER TABLE public.ticket_photos
ADD COLUMN IF NOT EXISTS category text DEFAULT 'SONSTIGES',
ADD COLUMN IF NOT EXISTS note text,
ADD COLUMN IF NOT EXISTS customer_visible boolean DEFAULT false;

-- Add comment to explain categories
COMMENT ON COLUMN public.ticket_photos.category IS 'Photo category: FLUESSIGKEITSSCHADEN, MECHANISCHER_SCHADEN, DISPLAY, GERAETEZUSTAND, SONSTIGES';
COMMENT ON COLUMN public.ticket_photos.customer_visible IS 'If true, photo is visible in customer tracking page';

-- Create index for faster queries when filtering customer-visible photos
CREATE INDEX IF NOT EXISTS idx_ticket_photos_customer_visible 
ON public.ticket_photos(repair_ticket_id, customer_visible) 
WHERE customer_visible = true;