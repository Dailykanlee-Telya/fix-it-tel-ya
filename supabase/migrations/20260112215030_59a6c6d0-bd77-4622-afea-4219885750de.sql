-- ============================================
-- PHASE 1B: RLS Policies & Funktionen
-- ============================================

-- 1. B2B Policy für workshops
CREATE POLICY "B2B users can view assigned workshop"
ON public.workshops
FOR SELECT
USING (
  is_b2b_user(auth.uid()) AND 
  id = (SELECT workshop_id FROM public.b2b_partners WHERE id = get_b2b_partner_id(auth.uid()))
);

-- 2. Helper-Funktion für Workshop-Zugriff
CREATE OR REPLACE FUNCTION public.can_view_workshop(_user_id uuid, _workshop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN has_role(_user_id, 'ADMIN') THEN true
    WHEN is_b2b_user(_user_id) THEN 
      _workshop_id = (SELECT workshop_id FROM public.b2b_partners WHERE id = get_b2b_partner_id(_user_id))
    WHEN is_employee(_user_id) THEN true
    ELSE false
  END
$$;

-- 3. Aktualisiere RLS für repair_tickets
DROP POLICY IF EXISTS "B2B users can view own tickets" ON public.repair_tickets;
CREATE POLICY "B2B users can view own tickets"
ON public.repair_tickets
FOR SELECT
USING (
  is_b2b_user(auth.uid()) AND 
  b2b_partner_id = get_b2b_partner_id(auth.uid())
);

DROP POLICY IF EXISTS "Employees can view tickets for their locations" ON public.repair_tickets;
CREATE POLICY "Employees can view tickets"
ON public.repair_tickets
FOR SELECT
USING (
  is_employee(auth.uid()) AND (
    (is_b2b = false AND can_view_location(auth.uid(), location_id)) OR
    (is_b2b = true AND can_view_workshop(auth.uid(), workshop_id))
  )
);

DROP POLICY IF EXISTS "Employees can update tickets for their locations" ON public.repair_tickets;
CREATE POLICY "Employees can update tickets"
ON public.repair_tickets
FOR UPDATE
USING (
  is_employee(auth.uid()) AND (
    (is_b2b = false AND can_view_location(auth.uid(), location_id)) OR
    (is_b2b = true AND can_view_workshop(auth.uid(), workshop_id))
  )
);

-- 4. Aktualisiere ticket_messages RLS
DROP POLICY IF EXISTS "Employees can view messages for their locations" ON public.ticket_messages;
CREATE POLICY "Employees can view messages"
ON public.ticket_messages
FOR SELECT
USING (
  is_employee(auth.uid()) AND (
    EXISTS (
      SELECT 1 FROM repair_tickets rt
      WHERE rt.id = ticket_messages.repair_ticket_id
      AND (
        (rt.is_b2b = false AND can_view_location(auth.uid(), rt.location_id)) OR
        (rt.is_b2b = true AND can_view_workshop(auth.uid(), rt.workshop_id))
      )
    )
  )
);

-- 5. Aktualisiere status_history RLS
DROP POLICY IF EXISTS "Employees can view status history for their locations" ON public.status_history;
CREATE POLICY "Employees can view status history"
ON public.status_history
FOR SELECT
USING (
  is_employee(auth.uid()) AND (
    EXISTS (
      SELECT 1 FROM repair_tickets rt
      WHERE rt.id = status_history.repair_ticket_id
      AND (
        (rt.is_b2b = false AND can_view_location(auth.uid(), rt.location_id)) OR
        (rt.is_b2b = true AND can_view_workshop(auth.uid(), rt.workshop_id))
      )
    )
  )
);

-- 6. Aktualisiere kva_estimates RLS
DROP POLICY IF EXISTS "Employees can view KVAs for their locations" ON public.kva_estimates;
CREATE POLICY "Employees can view KVAs"
ON public.kva_estimates
FOR SELECT
USING (
  is_employee(auth.uid()) AND (
    EXISTS (
      SELECT 1 FROM repair_tickets rt
      WHERE rt.id = kva_estimates.repair_ticket_id
      AND (
        (rt.is_b2b = false AND can_view_location(auth.uid(), rt.location_id)) OR
        (rt.is_b2b = true AND can_view_workshop(auth.uid(), rt.workshop_id))
      )
    )
  )
);

DROP POLICY IF EXISTS "Employees can update KVAs" ON public.kva_estimates;
CREATE POLICY "Employees can update KVAs"
ON public.kva_estimates
FOR UPDATE
USING (
  is_employee(auth.uid()) AND (
    EXISTS (
      SELECT 1 FROM repair_tickets rt
      WHERE rt.id = kva_estimates.repair_ticket_id
      AND (
        (rt.is_b2b = false AND can_view_location(auth.uid(), rt.location_id)) OR
        (rt.is_b2b = true AND can_view_workshop(auth.uid(), rt.workshop_id))
      )
    )
  )
);

-- 7. Aktualisiere kva_history RLS
DROP POLICY IF EXISTS "Employees can view KVA history" ON public.kva_history;
CREATE POLICY "Employees can view KVA history"
ON public.kva_history
FOR SELECT
USING (
  is_employee(auth.uid()) AND (
    EXISTS (
      SELECT 1 FROM kva_estimates ke
      JOIN repair_tickets rt ON rt.id = ke.repair_ticket_id
      WHERE ke.id = kva_history.kva_estimate_id
      AND (
        (rt.is_b2b = false AND can_view_location(auth.uid(), rt.location_id)) OR
        (rt.is_b2b = true AND can_view_workshop(auth.uid(), rt.workshop_id))
      )
    )
  )
);

-- 8. Aktualisiere feedback RLS
DROP POLICY IF EXISTS "Employees can view feedback for their locations" ON public.feedback;
CREATE POLICY "Employees can view feedback"
ON public.feedback
FOR SELECT
USING (
  is_employee(auth.uid()) AND (
    repair_ticket_id IS NULL OR
    EXISTS (
      SELECT 1 FROM repair_tickets rt
      WHERE rt.id = feedback.repair_ticket_id
      AND (
        (rt.is_b2b = false AND can_view_location(auth.uid(), rt.location_id)) OR
        (rt.is_b2b = true AND can_view_workshop(auth.uid(), rt.workshop_id))
      )
    )
  )
);

-- 9. Aktualisiere ticket_checklist_items RLS
DROP POLICY IF EXISTS "Employees can view ticket checklists for their locations" ON public.ticket_checklist_items;
CREATE POLICY "Employees can view ticket checklists"
ON public.ticket_checklist_items
FOR SELECT
USING (
  is_employee(auth.uid()) AND (
    EXISTS (
      SELECT 1 FROM repair_tickets rt
      WHERE rt.id = ticket_checklist_items.repair_ticket_id
      AND (
        (rt.is_b2b = false AND can_view_location(auth.uid(), rt.location_id)) OR
        (rt.is_b2b = true AND can_view_workshop(auth.uid(), rt.workshop_id))
      )
    )
  )
);

-- 10. Update generate_order_number für Workshop-Support
CREATE OR REPLACE FUNCTION public.generate_order_number(_location_id uuid, _b2b_partner_id uuid DEFAULT NULL::uuid, _workshop_id uuid DEFAULT NULL::uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year SMALLINT;
  _year_str TEXT;
  _code TEXT;
  _seq_num INTEGER;
  _order_number TEXT;
BEGIN
  _year := (EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER % 100)::SMALLINT;
  _year_str := LPAD(_year::TEXT, 2, '0');
  
  IF _b2b_partner_id IS NOT NULL THEN
    SELECT code INTO _code FROM public.b2b_partners WHERE id = _b2b_partner_id;
  ELSIF _workshop_id IS NOT NULL THEN
    SELECT code INTO _code FROM public.workshops WHERE id = _workshop_id;
  ELSE
    SELECT code INTO _code FROM public.locations WHERE id = _location_id;
  END IF;
  
  IF _code IS NULL OR _code = '' THEN
    _code := 'XX';
  END IF;
  
  _code := UPPER(SUBSTRING(_code, 1, 3));
  
  LOOP
    SELECT next_number INTO _seq_num
    FROM public.ticket_number_sequence
    WHERE year = _year
    FOR UPDATE;
    
    IF FOUND THEN
      UPDATE public.ticket_number_sequence 
      SET next_number = next_number + 1 
      WHERE year = _year;
      EXIT;
    ELSE
      BEGIN
        INSERT INTO public.ticket_number_sequence (year, next_number)
        VALUES (_year, 101);
        _seq_num := 100;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END;
    END IF;
  END LOOP;
  
  _order_number := 'TE' || _code || _year_str || LPAD(_seq_num::TEXT, 4, '0');
  
  RETURN _order_number;
END;
$$;

-- 11. Entferne B2B location policies
DROP POLICY IF EXISTS "B2B users can view assigned location" ON public.locations;
DROP POLICY IF EXISTS "B2B users can view locations" ON public.locations;