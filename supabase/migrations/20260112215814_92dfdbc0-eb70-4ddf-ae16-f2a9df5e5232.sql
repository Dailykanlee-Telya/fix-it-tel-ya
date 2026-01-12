
-- Phase 3: KVA-Statuskopplung, Foto-Kategorien, Kommunikations-Erweiterungen

-- 1. ENUM für Foto-Kategorien
CREATE TYPE public.photo_category AS ENUM (
  'zustand_eingang',
  'schadensbild',
  'reparatur_vorher',
  'reparatur_nachher',
  'sonstiges'
);

-- 2. ticket_photos: category auf ENUM umstellen und b2b_visible hinzufügen
ALTER TABLE public.ticket_photos 
ADD COLUMN IF NOT EXISTS category_enum public.photo_category;

ALTER TABLE public.ticket_photos 
ADD COLUMN IF NOT EXISTS b2b_visible BOOLEAN NOT NULL DEFAULT false;

-- Migrate existing category values
UPDATE public.ticket_photos 
SET category_enum = CASE 
  WHEN category = 'zustand_eingang' THEN 'zustand_eingang'::photo_category
  WHEN category = 'schadensbild' THEN 'schadensbild'::photo_category
  WHEN category = 'reparatur_vorher' THEN 'reparatur_vorher'::photo_category
  WHEN category = 'reparatur_nachher' THEN 'reparatur_nachher'::photo_category
  ELSE 'sonstiges'::photo_category
END
WHERE category IS NOT NULL;

-- Set visibility defaults based on category
UPDATE public.ticket_photos 
SET b2b_visible = CASE 
  WHEN category_enum IN ('zustand_eingang', 'schadensbild', 'reparatur_nachher') THEN true
  ELSE false
END,
customer_visible = CASE 
  WHEN category_enum IN ('zustand_eingang', 'schadensbild', 'reparatur_nachher') THEN true
  ELSE false
END
WHERE category_enum IS NOT NULL;

-- 3. ENUM für Nachrichten-Typen
CREATE TYPE public.message_type AS ENUM (
  'internal_note',
  'b2b_message',
  'customer_message'
);

-- 4. ticket_messages: message_type auf ENUM umstellen
ALTER TABLE public.ticket_messages 
ADD COLUMN IF NOT EXISTS message_type_enum public.message_type;

UPDATE public.ticket_messages 
SET message_type_enum = CASE 
  WHEN message_type = 'internal_note' THEN 'internal_note'::message_type
  WHEN message_type = 'b2b_message' THEN 'b2b_message'::message_type
  WHEN message_type = 'customer_message' THEN 'customer_message'::message_type
  ELSE 'internal_note'::message_type
END;

-- 5. KVA-Status-Trigger: Bei KVA-Erstellung → Status auf WARTET_AUF_FREIGABE
CREATE OR REPLACE FUNCTION public.kva_status_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Bei Erstellung eines neuen KVA: Ticket-Status auf WARTET_AUF_FREIGABE
  IF TG_OP = 'INSERT' THEN
    UPDATE public.repair_tickets
    SET status = 'WARTET_AUF_FREIGABE'::ticket_status,
        kva_required = true,
        updated_at = now()
    WHERE id = NEW.repair_ticket_id
      AND status NOT IN ('ABGEHOLT', 'STORNIERT', 'ENTSORGT');
    
    -- Status-History eintragen
    INSERT INTO public.status_history (repair_ticket_id, old_status, new_status, changed_by_user_id, note)
    SELECT id, status, 'WARTET_AUF_FREIGABE'::ticket_status, NEW.created_by, 'KVA erstellt'
    FROM public.repair_tickets
    WHERE id = NEW.repair_ticket_id;
  END IF;
  
  -- Bei Freigabe (status = 'APPROVED'): Ticket-Status auf FREIGEGEBEN
  IF TG_OP = 'UPDATE' AND NEW.status = 'APPROVED' AND OLD.status != 'APPROVED' THEN
    UPDATE public.repair_tickets
    SET status = 'FREIGEGEBEN'::ticket_status,
        kva_approved = true,
        kva_approved_at = now(),
        updated_at = now()
    WHERE id = NEW.repair_ticket_id
      AND status NOT IN ('ABGEHOLT', 'STORNIERT', 'ENTSORGT');
    
    -- Status-History eintragen
    INSERT INTO public.status_history (repair_ticket_id, old_status, new_status, changed_by_user_id, note)
    SELECT id, status, 'FREIGEGEBEN'::ticket_status, NEW.updated_by, 'KVA freigegeben'
    FROM public.repair_tickets
    WHERE id = NEW.repair_ticket_id;
  END IF;
  
  -- Bei Ablehnung (status = 'REJECTED'): Ticket-Status auf WARTET_AUF_FREIGABE lassen
  
  RETURN NEW;
END;
$$;

-- Trigger an kva_estimates anhängen
DROP TRIGGER IF EXISTS kva_status_sync ON public.kva_estimates;
CREATE TRIGGER kva_status_sync
AFTER INSERT OR UPDATE ON public.kva_estimates
FOR EACH ROW
EXECUTE FUNCTION public.kva_status_trigger();

-- 6. RLS für ticket_photos - B2B sieht nur b2b_visible = true
DROP POLICY IF EXISTS "B2B can view visible photos" ON public.ticket_photos;
CREATE POLICY "B2B can view visible photos"
ON public.ticket_photos
FOR SELECT
USING (
  -- Mitarbeiter sehen alles
  public.is_employee(auth.uid())
  OR (
    -- B2B sieht nur b2b_visible UND eigene Partner-Tickets
    public.is_b2b_user(auth.uid())
    AND b2b_visible = true
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_photos.repair_ticket_id
        AND rt.b2b_partner_id = public.get_b2b_partner_id(auth.uid())
    )
  )
);

-- 7. RLS für ticket_messages - B2B sieht keine internal_notes
DROP POLICY IF EXISTS "Users can view messages for their tickets" ON public.ticket_messages;
CREATE POLICY "Users can view messages based on type"
ON public.ticket_messages
FOR SELECT
USING (
  -- Mitarbeiter sehen alles
  public.is_employee(auth.uid())
  OR (
    -- B2B sieht b2b_message und customer_message, NICHT internal_note
    public.is_b2b_user(auth.uid())
    AND message_type IN ('b2b_message', 'customer_message')
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_messages.repair_ticket_id
        AND rt.b2b_partner_id = public.get_b2b_partner_id(auth.uid())
    )
  )
);

-- 8. B2B kann nur b2b_message erstellen
DROP POLICY IF EXISTS "Users can create messages" ON public.ticket_messages;
CREATE POLICY "Users can create messages based on role"
ON public.ticket_messages
FOR INSERT
WITH CHECK (
  -- Mitarbeiter können alle Typen erstellen
  (public.is_employee(auth.uid()) AND sender_user_id = auth.uid())
  OR (
    -- B2B kann nur b2b_message erstellen
    public.is_b2b_user(auth.uid())
    AND message_type = 'b2b_message'
    AND sender_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = repair_ticket_id
        AND rt.b2b_partner_id = public.get_b2b_partner_id(auth.uid())
    )
  )
);
