
-- 1. Fix KVA status trigger: use correct enum value
CREATE OR REPLACE FUNCTION public.kva_status_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Bei Erstellung eines neuen KVA: Ticket-Status auf WARTET_AUF_TEIL_ODER_FREIGABE
  IF TG_OP = 'INSERT' THEN
    UPDATE public.repair_tickets
    SET status = 'WARTET_AUF_TEIL_ODER_FREIGABE'::ticket_status,
        kva_required = true,
        updated_at = now()
    WHERE id = NEW.repair_ticket_id
      AND status NOT IN ('ABGEHOLT', 'STORNIERT');

    -- Status-History eintragen
    INSERT INTO public.status_history (repair_ticket_id, old_status, new_status, changed_by_user_id, note)
    SELECT id, status, 'WARTET_AUF_TEIL_ODER_FREIGABE'::ticket_status, NEW.created_by, 'KVA erstellt'
    FROM public.repair_tickets
    WHERE id = NEW.repair_ticket_id;
  END IF;

  -- Bei Freigabe (status = 'APPROVED' or 'FREIGEGEBEN'): Ticket-Status auf FREIGEGEBEN
  IF TG_OP = 'UPDATE' AND NEW.status IN ('APPROVED', 'FREIGEGEBEN') AND OLD.status NOT IN ('APPROVED', 'FREIGEGEBEN') THEN
    UPDATE public.repair_tickets
    SET status = 'FREIGEGEBEN'::ticket_status,
        kva_approved = true,
        kva_approved_at = now(),
        updated_at = now()
    WHERE id = NEW.repair_ticket_id
      AND status NOT IN ('ABGEHOLT', 'STORNIERT');

    INSERT INTO public.status_history (repair_ticket_id, old_status, new_status, changed_by_user_id, note)
    SELECT id, status, 'FREIGEGEBEN'::ticket_status, NEW.updated_by, 'KVA freigegeben'
    FROM public.repair_tickets
    WHERE id = NEW.repair_ticket_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Extend price_list with additional columns
ALTER TABLE public.price_list
  ADD COLUMN IF NOT EXISTS net_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS tax_rate numeric(5,2) NOT NULL DEFAULT 19.00,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes integer;

-- Backfill net_price from price for existing rows
UPDATE public.price_list SET net_price = ROUND(price / (1 + tax_rate / 100), 2) WHERE net_price IS NULL;

-- 3. Create kva_estimate_items table
CREATE TYPE public.kva_item_type AS ENUM ('ARBEIT', 'ERSATZTEIL', 'DIENSTLEISTUNG', 'RABATT', 'SONSTIGES');

CREATE TABLE public.kva_estimate_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kva_estimate_id uuid NOT NULL REFERENCES public.kva_estimates(id) ON DELETE CASCADE,
  item_type kva_item_type NOT NULL DEFAULT 'ARBEIT',
  title text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_gross numeric(10,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 19.00,
  total_gross numeric(10,2) GENERATED ALWAYS AS (quantity * unit_price_gross) STORED,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  part_id uuid REFERENCES public.parts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kva_estimate_items ENABLE ROW LEVEL SECURITY;

-- Employees can manage items for tickets they can view
CREATE POLICY "Employees can view kva items"
ON public.kva_estimate_items FOR SELECT
USING (
  is_employee(auth.uid()) AND EXISTS (
    SELECT 1 FROM kva_estimates ke
    JOIN repair_tickets rt ON rt.id = ke.repair_ticket_id
    WHERE ke.id = kva_estimate_items.kva_estimate_id
      AND ((rt.is_b2b = false AND can_view_location(auth.uid(), rt.location_id))
        OR (rt.is_b2b = true AND can_view_workshop(auth.uid(), rt.workshop_id)))
  )
);

CREATE POLICY "Employees can insert kva items"
ON public.kva_estimate_items FOR INSERT
WITH CHECK (is_employee(auth.uid()));

CREATE POLICY "Employees can update kva items"
ON public.kva_estimate_items FOR UPDATE
USING (
  is_employee(auth.uid()) AND EXISTS (
    SELECT 1 FROM kva_estimates ke
    JOIN repair_tickets rt ON rt.id = ke.repair_ticket_id
    WHERE ke.id = kva_estimate_items.kva_estimate_id
      AND ((rt.is_b2b = false AND can_view_location(auth.uid(), rt.location_id))
        OR (rt.is_b2b = true AND can_view_workshop(auth.uid(), rt.workshop_id)))
  )
);

CREATE POLICY "Employees can delete kva items"
ON public.kva_estimate_items FOR DELETE
USING (
  is_employee(auth.uid()) AND EXISTS (
    SELECT 1 FROM kva_estimates ke
    JOIN repair_tickets rt ON rt.id = ke.repair_ticket_id
    WHERE ke.id = kva_estimate_items.kva_estimate_id
      AND ((rt.is_b2b = false AND can_view_location(auth.uid(), rt.location_id))
        OR (rt.is_b2b = true AND can_view_workshop(auth.uid(), rt.workshop_id)))
  )
);

CREATE POLICY "B2B users can view own kva items"
ON public.kva_estimate_items FOR SELECT
USING (
  is_b2b_user(auth.uid()) AND EXISTS (
    SELECT 1 FROM kva_estimates ke
    JOIN repair_tickets rt ON rt.id = ke.repair_ticket_id
    WHERE ke.id = kva_estimate_items.kva_estimate_id
      AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_kva_estimate_items_updated_at
BEFORE UPDATE ON public.kva_estimate_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
