-- ============================================
-- PHASE 1A: Workshops-Tabelle erstellen
-- ============================================

-- 1. Erstelle workshops Tabelle
CREATE TABLE public.workshops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code varchar(5) NULL,
  address jsonb NULL,
  phone text NULL,
  email text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. RLS für workshops aktivieren
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;

-- 3. Basis RLS Policies für workshops (ohne B2B-Abhängigkeit)
CREATE POLICY "Admins can manage workshops"
ON public.workshops
FOR ALL
USING (has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Employees can view workshops"
ON public.workshops
FOR SELECT
USING (is_employee(auth.uid()));

-- 4. Trigger für updated_at
CREATE TRIGGER update_workshops_updated_at
BEFORE UPDATE ON public.workshops
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Füge workshop_id zu b2b_partners hinzu
ALTER TABLE public.b2b_partners
ADD COLUMN workshop_id uuid REFERENCES public.workshops(id);

-- 6. Entferne location_id FK von b2b_partners
ALTER TABLE public.b2b_partners
DROP CONSTRAINT IF EXISTS b2b_partners_location_id_fkey;

COMMENT ON COLUMN public.b2b_partners.location_id IS 'DEPRECATED: Use workshop_id instead';

-- 7. Füge workshop_id zu repair_tickets hinzu
ALTER TABLE public.repair_tickets
ADD COLUMN workshop_id uuid REFERENCES public.workshops(id);

-- 8. Entferne NOT NULL von location_id für B2B-Tickets
ALTER TABLE public.repair_tickets
ALTER COLUMN location_id DROP NOT NULL;