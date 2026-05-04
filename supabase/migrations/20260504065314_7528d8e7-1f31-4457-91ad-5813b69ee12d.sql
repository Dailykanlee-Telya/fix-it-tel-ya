
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

    INSERT INTO public.status_history (repair_ticket_id, old_status, new_status, changed_by_user_id, note)
    SELECT id, status, 'WARTET_AUF_TEIL_ODER_FREIGABE'::ticket_status, NEW.created_by, 'KVA erstellt'
    FROM public.repair_tickets
    WHERE id = NEW.repair_ticket_id;
  END IF;

  -- Bei Freigabe: Ticket-Status auf FREIGEGEBEN
  IF TG_OP = 'UPDATE' AND NEW.status = 'FREIGEGEBEN' AND OLD.status != 'FREIGEGEBEN' THEN
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
